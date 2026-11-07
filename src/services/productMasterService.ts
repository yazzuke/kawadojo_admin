import api from './api';

export interface MasterProductRow {
  id: string;
  name: string;
  slug: string;
  prefix: string | null;
  suffix: string | null;
  outlier: boolean;
  condition: string | null;
  price: number;
  in_stock: boolean | null;
  is_incoming: boolean | null;
  group_tag: string | null;
  oem_code: string | null;
  category_id: string | null;
  batch_code: string | null;
  image: string | null;
  image_count: number;
  models: Array<{ id: string; name: string }>;
}

export interface RankedValue { value: string; count: number }

export interface MasterOptions {
  names: RankedValue[];
  descriptions: RankedValue[];
  full_descriptions: RankedValue[];
  oem_codes: RankedValue[];
  group_tags: RankedValue[];
  category_id: string | null;
  photo_product_id: string | null;
  models: Array<{ id: string; name: string }>;
}

export interface MasterProposal {
  key: string;
  master: { id: string; name: string } | null;
  count: number;
  name_variants: number;
  issues: { names: number; descriptions: number; without_tag: number; without_photo: number; tags: number };
  options: MasterOptions;
  products: MasterProductRow[];
}

export interface ProductMaster {
  id: string;
  name: string;
  group_tag: string | null;
  description: string | null;
  full_description: string | null;
  category: { id: string; name: string } | null;
  oem_code: string | null;
  photo_product_id: string | null;
  products: MasterProductRow[];
  options: MasterOptions;
}

export interface UnifyPayload {
  master_id?: string | null;
  name: string;
  group_tag?: string | null;
  description?: string | null;
  full_description?: string | null;
  category_id?: string | null;
  oem_code?: string | null;
  photo_product_id?: string | null;
  model_ids?: string[];
  product_ids: string[];
  apply: {
    name?: boolean;
    description?: boolean;
    category?: boolean;
    oem?: boolean;
    group_tag?: boolean;
    models?: boolean;
    copy_photos?: boolean;
    replace_new_photos?: boolean;
  };
}

export interface AiDescription {
  description: string;
  full_description: string;
  warnings: string[];
  impex: { found: boolean; name: string | null; replaced_by: string | null; discontinued: boolean } | null;
  saved_part: { part_no: string; name: string | null } | null;
}

export const productMasterService = {
  // La IA propone descripción corta y larga; no guarda nada
  async aiDescription(payload: {
    name: string;
    oem_code: string | null;
    category_id: string | null;
    model_ids: string[];
    conditions: { nuevo: number; usado: number };
    current_descriptions: string[];
    extra: string | null;
  }): Promise<AiDescription> {
    const res = await api.post('/product-masters/ai-description', payload, { timeout: 90_000 });
    return res.data.data;
  },
  async proposals(): Promise<MasterProposal[]> {
    const res = await api.get('/product-masters/proposals', { timeout: 60_000 });
    return res.data.data;
  },
  async list(): Promise<ProductMaster[]> {
    const res = await api.get('/product-masters');
    return res.data.data;
  },
  async unify(payload: UnifyPayload): Promise<{ master_id: string; linked: number; renamed: number; photos_copied: number }> {
    const res = await api.post('/product-masters/unify', payload, { timeout: 90_000 });
    return res.data.data;
  },
  // Sube fotos a un producto del grupo; con first quedan de primeras (la primera es la principal)
  async addPhotos(productId: string, files: File[], first = true): Promise<{ product_id: string; image_count: number; image: string | null }> {
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    form.append('first', String(first));
    const res = await api.post(`/product-masters/product/${productId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    });
    return res.data.data;
  },
  async detach(productId: string) {
    await api.delete(`/product-masters/product/${productId}`);
  },
  async remove(masterId: string) {
    await api.delete(`/product-masters/${masterId}`);
  },
};

// Igual que en el backend: marca + nombre de la ficha + lote; a los usados no se les pone "NUEVO SELLADO"
export const composeName = (masterName: string, row: Pick<MasterProductRow, 'prefix' | 'suffix' | 'condition'>) => {
  const name = row.condition && row.condition !== 'nuevo'
    ? masterName.replace(/\b(nuevo|nueva|sellado|sellada)\b/gi, '').replace(/\s+/g, ' ').trim()
    : masterName.trim();
  let out = row.prefix ? `${row.prefix} ${name}` : name;
  if (row.suffix) out = row.suffix.startsWith('-') ? `${out}${row.suffix}` : `${out} ${row.suffix}`;
  return out;
};

export const tagFromName = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(nuevo|nueva|usado|usada|sellado|sellada|original|oem)\b/gi, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);

// Mensaje que manda el backend, o uno por defecto
export const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
