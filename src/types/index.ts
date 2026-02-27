export interface Client {
  id_ext?: string;
  extrabat_id?: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  code_postal?: string;
  ville?: string;
}

export interface ProductMedia {
  id: string;
  product_id: string;
  media_type: 'image' | 'video';
  file_path: string;
  thumbnail_path?: string;
  display_order: number;
  title?: string;
  is_primary?: boolean;
  created_at?: string;
}

export interface Product {
  id: string;
  reference: string;
  name: string;
  category: string;
  description_short: string;
  description_long: string;
  price_ht: number;
  default_vat_rate: number;
  photo_path?: string;
  photo_square_path?: string;
  is_active: boolean;
  proposer_en_option?: boolean;
  upsells?: boolean;
  ref_extrabat?: string;
  media_items?: ProductMedia[];
}

export interface DevisLine {
  id: string;
  product?: Product;
  product_id?: string;
  reference: string;
  name: string;
  description: string;
  quantity: number;
  price_ht: number;
  vat_rate: number;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  ref_extrabat?: string;
}

export interface DevisTotals {
  ht: number;
  tva: { [key: string]: number };
  ttc: number;
  acompte: number;
}

export interface DevisOptions {
  leasing?: boolean;
  telesurveillance?: boolean;
}

export interface DevisSignatures {
  client?: string;
}

export interface SelectedProductOption {
  product_id: string;
  quantity: number;
}

export interface Devis {
  id?: string;
  client: Client;
  titre_affaire: string;
  devis_type?: 'installation_neuve' | 'upsell_entretien';
  taux_tva: number;
  lignes: DevisLine[];
  totaux: DevisTotals;
  observations: string;
  options: DevisOptions;
  signatures: DevisSignatures;
  croquis_path?: string;
  photos?: string[];
  status: 'draft' | 'sent' | 'signed';
  access_token?: string;
  public_token?: string;
  accepted_at?: string;
  accepted_ip?: string;
  accepted_status?: 'pending' | 'accepted' | 'rejected';
  selected_options?: SelectedProductOption[];
  custom_quantities?: { [lineId: string]: number };
  intro_text?: string;
  intro_generated_at?: string;
  intro_manual_edit?: boolean;
  devis_number?: string;
  extrabat_devis_id?: number;
  created_at?: string;
  updated_at?: string;
}