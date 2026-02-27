import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      const productsWithMedia = await Promise.all(
        (data || []).map(async (product) => {
          const { data: mediaItems } = await supabase
            .from('product_media')
            .select('*')
            .eq('product_id', product.id)
            .order('display_order', { ascending: true });

          return {
            ...product,
            media_items: mediaItems || []
          };
        })
      );

      setProducts(productsWithMedia);

      const uniqueCategories = [...new Set((data || []).map(p => p.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;

      // Refresh the products list
      await fetchProducts();

      return { success: true };
    } catch (error: any) {
      console.error('Error adding product:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de l\'ajout du produit' 
      };
    }
  };

  const getProductImageUrl = (product: Product & { media_items?: any[] }) => {
    // Priorité 1 : Utiliser la miniature du premier média de product_media si disponible
    if (product.media_items && product.media_items.length > 0) {
      const firstMedia = product.media_items[0];
      // Utiliser la miniature si disponible, sinon l'image complète
      const imagePath = firstMedia.thumbnail_path || firstMedia.file_path;
      if (imagePath) {
        const { data } = supabase.storage
          .from('products')
          .getPublicUrl(imagePath);

        return data.publicUrl;
      }
    }

    // Priorité 2 : Utiliser photo_square_path (rétrocompatibilité)
    if (product.photo_square_path) {
      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(product.photo_square_path);

      return data.publicUrl;
    }

    return null;
  };

  const getPublicUrlForStoragePath = (storagePath: string | null | undefined): string | null => {
    if (!storagePath) return null;

    // Clean path from any invisible characters like \r\n
    const cleanPath = storagePath.trim().replace(/[\r\n\t]/g, '');

    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(cleanPath);

    return data.publicUrl;
  };

  const fetchUpsellProducts = async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('upsells', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      const productsWithMedia = await Promise.all(
        (data || []).map(async (product) => {
          const { data: mediaItems } = await supabase
            .from('product_media')
            .select('*')
            .eq('product_id', product.id)
            .order('display_order', { ascending: true });

          return {
            ...product,
            media_items: mediaItems || []
          };
        })
      );

      return productsWithMedia;
    } catch (error) {
      console.error('Error fetching upsell products:', error);
      return [];
    }
  };

  return {
    products,
    categories,
    loading,
    fetchProducts,
    fetchUpsellProducts,
    addProduct,
    getProductImageUrl,
    getPublicUrlForStoragePath,
  };
};