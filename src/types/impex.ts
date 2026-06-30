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
  price_rub: number;
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
  price_rub: number;
  weight: number;
  type_id: number;
  kawadojo_price: number;
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
  price_rub: number | null;
  weight: number | null;
  type_id: number | null;
  kawadojo_price: number;
  compatible_moto_models?: string[];
  created_at?: string;
  updated_at?: string;
}
