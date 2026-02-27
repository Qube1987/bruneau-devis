export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          company: string | null;
          siret: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          company?: string | null;
          siret?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          company?: string | null;
          siret?: string | null;
          notes?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          reference: string;
          name: string;
          category: string;
          description_short: string;
          description_long: string;
          price_ht: number;
          default_vat_rate: number;
          photo_path: string | null;
          photo_square_path: string | null;
          is_active: boolean;
          upsells: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference: string;
          name: string;
          category: string;
          description_short: string;
          description_long: string;
          price_ht: number;
          default_vat_rate?: number;
          photo_path?: string | null;
          photo_square_path?: string | null;
          is_active?: boolean;
          upsells?: boolean;
        };
        Update: {
          id?: string;
          reference?: string;
          name?: string;
          category?: string;
          description_short?: string;
          description_long?: string;
          price_ht?: number;
          default_vat_rate?: number;
          photo_path?: string | null;
          photo_square_path?: string | null;
          is_active?: boolean;
          upsells?: boolean;
        };
      };
      devis: {
        Row: {
          id: string;
          client: any;
          client_id: string | null;
          titre_affaire: string;
          devis_type: 'installation_neuve' | 'upsell_entretien';
          taux_tva: number;
          lignes: any[];
          totaux: any;
          observations: string;
          options: any;
          signatures: any;
          croquis_path: string | null;
          status: 'draft' | 'sent' | 'signed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client: any;
          client_id?: string | null;
          titre_affaire: string;
          devis_type?: 'installation_neuve' | 'upsell_entretien';
          taux_tva?: number;
          lignes?: any[];
          totaux?: any;
          observations?: string;
          options?: any;
          signatures?: any;
          croquis_path?: string | null;
          status?: 'draft' | 'sent' | 'signed';
        };
        Update: {
          id?: string;
          client?: any;
          client_id?: string | null;
          titre_affaire?: string;
          devis_type?: 'installation_neuve' | 'upsell_entretien';
          taux_tva?: number;
          lignes?: any[];
          totaux?: any;
          observations?: string;
          options?: any;
          signatures?: any;
          croquis_path?: string | null;
          status?: 'draft' | 'sent' | 'signed';
        };
      };
      media_library: {
        Row: {
          id: string;
          file_path: string;
          file_hash: string;
          file_size: number;
          original_filename: string;
          media_type: 'image' | 'video';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          file_path: string;
          file_hash: string;
          file_size: number;
          original_filename: string;
          media_type: 'image' | 'video';
        };
        Update: {
          id?: string;
          file_path?: string;
          file_hash?: string;
          file_size?: number;
          original_filename?: string;
          media_type?: 'image' | 'video';
        };
      };
      product_media: {
        Row: {
          id: string;
          product_id: string;
          media_library_id: string | null;
          media_type: 'image' | 'video';
          file_path: string;
          display_order: number;
          title: string | null;
          is_primary: boolean;
          file_hash: string | null;
          file_size: number | null;
          original_filename: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          media_library_id?: string | null;
          media_type: 'image' | 'video';
          file_path: string;
          display_order?: number;
          title?: string | null;
          is_primary?: boolean;
          file_hash?: string | null;
          file_size?: number | null;
          original_filename?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          media_library_id?: string | null;
          media_type?: 'image' | 'video';
          file_path?: string;
          display_order?: number;
          title?: string | null;
          is_primary?: boolean;
          file_hash?: string | null;
          file_size?: number | null;
          original_filename?: string | null;
        };
      };
    };
  };
}