export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface CompatibleModel {
  id: string;
  name: string;
  logo_url: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  full_description: string | null;
  category_id: string;
  price: number;
  cost: number | null;
  in_stock: boolean;
  is_original: boolean;
  condition: 'nuevo' | 'usado';
  source: string;
  created_at: string;
  updated_at: string;
  category_name: string;
  category_slug: string;
  images: ProductImage[];
  compatible_models: CompatibleModel[];
}

export interface CreateProductData {
  name: string;
  slug: string;
  price: number;
  cost?: number;
  description: string;
  condition: 'nuevo' | 'usado';
  in_stock: boolean;
  is_original: boolean;
  source: string;
  category_id: string;
  compatible_models: string[];
  images: File[];
}
