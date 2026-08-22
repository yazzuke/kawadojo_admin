export interface ImpexPart {
  mark_id: number;
  bl_code: number;
  is_original: boolean;
  mark: string;
  part: string;
  part_no_raw: string;
  name: string;
  name_eng: string;
  name_rus: string;
  price_yen: number;
  price_usd: number;
  weight: number;
  is_discontinued: boolean;
  discontinued_title: string | null;
  is_replaced: boolean;
  type_id: number;
  name_es: string;
  name_en: string;
}

export interface ImpexData {
  original_parts: ImpexPart[];
  replacement_parts: ImpexPart[];
}

export interface ImpexResponse {
  success: boolean;
  data: ImpexData;
}

export interface ImpexSavePayload {
  mark: string;
  part_no: string;
  part_no_raw: string;
  name_ja: string;
  name_es: string;
  name_en: string;
  price_yen: number;
  price_usd: number;
  weight: number;
  type_id: number;
  kawadojo_price: number;
  profit: number;
  margin: number;
  compatible_moto_models?: string[];
}

export interface SavedImpexPart {
  id: number;
  mark: string;
  part_no: string;
  part_no_raw: string;
  name_ja: string | null;
  name_es: string | null;
  name_en: string | null;
  price_yen: number | null;
  price_usd: number | null;
  weight: number | null;
  type_id: number | null;
  kawadojo_price: number;
  compatible_moto_models?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ImpexQuoteItem {
  id?: string;
  quote_id?: string;
  impex_part_id: string;
  quantity: number;
  unit_price_yen: number;
  unit_price_usd: number;
  impex_part?: SavedImpexPart; // relation
}

export interface ImpexQuote {
  id?: string;
  quote_number?: string;
  status?: string;
  
  exchange_rate_jpy_cop: number;
  exchange_rate_usd_jpy: number;
  
  subtotal_yen?: number;
  subtotal_usd?: number;
  
  shipping_usd: number;
  shipping_trm?: number;
  
  requires_taxes?: boolean;
  carrier?: string;
  customs_trm?: number;
  carrier_fees_cop?: number;
  iva_usd?: number;
  arancel_usd?: number;
  
  total_usd?: number;
  total_cop?: number;
  
  created_at?: string;
  
  items: ImpexQuoteItem[];
}
