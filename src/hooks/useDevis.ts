import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Devis } from '../types';
import { generateSecureToken } from '../lib/token-utils';

export const useDevis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveDevis = async (devis: Devis): Promise<{ success: boolean; id?: string; token?: string; paymentToken?: string; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      // Upsert client in clients table if extrabat_id is present
      let clientId: string | undefined;
      if (devis.client.extrabat_id) {
        // Check if client already exists by extrabat_id
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('extrabat_id', devis.client.extrabat_id)
          .maybeSingle();

        if (existingClient) {
          // Update existing client
          const { data: updatedClient, error: updateError } = await supabase
            .from('clients')
            .update({
              nom: devis.client.nom,
              prenom: devis.client.prenom,
              email: devis.client.email,
              telephone: devis.client.telephone,
              adresse: devis.client.adresse,
              code_postal: devis.client.code_postal,
              ville: devis.client.ville,
            })
            .eq('id', existingClient.id)
            .select()
            .single();

          if (updateError) throw updateError;
          clientId = updatedClient.id;
        } else {
          // Create new client
          const { data: newClient, error: insertError } = await supabase
            .from('clients')
            .insert({
              extrabat_id: devis.client.extrabat_id,
              nom: devis.client.nom,
              prenom: devis.client.prenom,
              email: devis.client.email,
              telephone: devis.client.telephone,
              adresse: devis.client.adresse,
              code_postal: devis.client.code_postal,
              ville: devis.client.ville,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          clientId = newClient.id;
        }
      }

      // Generate access token if not exists
      const accessToken = devis.access_token || generateSecureToken();

      // Prepare lignes data (strip out product object for DB storage)
      const lignesForDb = devis.lignes.map(line => ({
        id: line.id,
        reference: line.reference,
        name: line.name,
        description: line.description,
        quantity: line.quantity,
        price_ht: line.price_ht,
        vat_rate: line.vat_rate,
        total_ht: line.total_ht,
        total_vat: line.total_vat,
        total_ttc: line.total_ttc,
        product_id: line.product?.id,
        ref_extrabat: line.product?.ref_extrabat || line.ref_extrabat
      }));

      // Prepare data for database
      const devisData: any = {
        client: devis.client,
        titre_affaire: devis.titre_affaire,
        taux_tva: devis.taux_tva,
        lignes: lignesForDb,
        totaux: devis.totaux,
        observations: devis.observations,
        options: devis.options,
        signatures: devis.signatures,
        croquis_path: devis.croquis_path,
        photos: devis.photos,
        status: devis.status,
        access_token: accessToken,
        intro_text: devis.intro_text,
        intro_generated_at: devis.intro_generated_at,
        intro_manual_edit: devis.intro_manual_edit,
        devis_number: devis.devis_number,
        extrabat_devis_id: devis.extrabat_devis_id
      };

      // Add client_id if we created/updated a client
      if (clientId) {
        devisData.client_id = clientId;
      }

      let result;

      if (devis.id) {
        // Update existing devis
        const { data, error } = await supabase
          .from('devis')
          .update(devisData)
          .eq('id', devis.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new devis
        const { data, error } = await supabase
          .from('devis')
          .insert(devisData)
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Sync to Extrabat if client has extrabat_id
        if (devis.client.extrabat_id) {
          try {
            const syncResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-devis-to-extrabat`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ devisId: result.id }),
              }
            );

            if (syncResponse.ok) {
              // Reload the devis to get the updated devis_number from Extrabat
              const { data: updatedDevis } = await supabase
                .from('devis')
                .select()
                .eq('id', result.id)
                .single();

              if (updatedDevis) {
                result = updatedDevis;
              }
            } else {
              console.error('Failed to sync devis to Extrabat');
            }
          } catch (syncError) {
            console.error('Error syncing to Extrabat:', syncError);
          }
        }
      }

      return {
        success: true,
        id: result.id,
        token: result.access_token,
        paymentToken: result.payment_link_token
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const loadDevis = async (id: string): Promise<{ success: boolean; devis?: Devis; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('devis')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Enrich lines with product data
      if (data.lignes && Array.isArray(data.lignes)) {
        const productIds = data.lignes
          .map((line: any) => line.product_id)
          .filter((id: string | undefined) => id);

        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('*')
            .in('id', productIds);

          if (products) {
            // Load media items for all products
            const { data: allMediaItems } = await supabase
              .from('product_media')
              .select('*')
              .in('product_id', productIds)
              .order('display_order', { ascending: true });

            data.lignes = data.lignes.map((line: any) => {
              if (line.product_id) {
                const product = products.find((p) => p.id === line.product_id);
                if (product && allMediaItems) {
                  const mediaItems = allMediaItems.filter((m: any) => m.product_id === line.product_id);
                  return {
                    ...line,
                    ref_extrabat: line.ref_extrabat || product.ref_extrabat,
                    product: {
                      ...product,
                      media_items: mediaItems
                    }
                  };
                }
                return {
                  ...line,
                  ref_extrabat: line.ref_extrabat || product?.ref_extrabat,
                  product
                };
              }
              return line;
            });
          }
        }
      }

      return { success: true, devis: data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const getDevisList = async (): Promise<{ success: boolean; devis?: Devis[]; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('devis')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Enrich all devis lines with product data
      if (data && data.length > 0) {
        const allProductIds = new Set<string>();
        data.forEach((devis: any) => {
          if (devis.lignes && Array.isArray(devis.lignes)) {
            devis.lignes.forEach((line: any) => {
              if (line.product_id) {
                allProductIds.add(line.product_id);
              }
            });
          }
        });

        if (allProductIds.size > 0) {
          const productIdsArray = Array.from(allProductIds);

          const { data: products } = await supabase
            .from('products')
            .select('*')
            .in('id', productIdsArray);

          // Load media items for all products
          const { data: allMediaItems } = await supabase
            .from('product_media')
            .select('*')
            .in('product_id', productIdsArray)
            .order('display_order', { ascending: true });

          if (products) {
            data.forEach((devis: any) => {
              if (devis.lignes && Array.isArray(devis.lignes)) {
                devis.lignes = devis.lignes.map((line: any) => {
                  if (line.product_id) {
                    const product = products.find((p) => p.id === line.product_id);
                    if (product && allMediaItems) {
                      const mediaItems = allMediaItems.filter((m: any) => m.product_id === line.product_id);
                      return {
                        ...line,
                        ref_extrabat: line.ref_extrabat || product.ref_extrabat,
                        product: {
                          ...product,
                          media_items: mediaItems
                        }
                      };
                    }
                    return {
                      ...line,
                      ref_extrabat: line.ref_extrabat || product?.ref_extrabat,
                      product
                    };
                  }
                  return line;
                });
              }
            });
          }
        }
      }

      return { success: true, devis: data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement de la liste';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    saveDevis,
    loadDevis,
    getDevisList,
    deleteDevis: async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setLoading(true);
        setError(null);

        const { error } = await supabase
          .from('devis')
          .delete()
          .eq('id', id);

        if (error) throw error;

        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    }
  };
};