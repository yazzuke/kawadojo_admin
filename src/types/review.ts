// ===== Media =====
export interface ReviewMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  uploaded_by: 'admin' | 'customer';
  caption: string | null;
}

// ===== Public token endpoint response =====
export interface ReviewTokenProduct {
  product_name: string;
  quantity: number;
}

export interface ReviewTokenData {
  id: string;
  order_number: string;
  admin_caption: string;
  customer_name: string;
  rating: number | null;
  comment: string | null;
  status: ReviewStatus;
  delivered_at: string;
  products: ReviewTokenProduct[];
  media: ReviewMedia[];
  already_submitted: boolean;
}

// ===== Public testimonials endpoint =====
export interface PublicTestimonial {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  admin_caption: string;
  is_featured: boolean;
  products: string[];
  media: ReviewMedia[];
  submitted_at: string;
}

// ===== Admin list endpoint =====
export type ReviewStatus = 'pending' | 'submitted' | 'published' | 'hidden';

export interface ReviewOrderUser {
  name: string;
  email: string;
  phone: string;
}

export interface ReviewOrderItem {
  product_name: string;
  quantity: number;
}

export interface ReviewOrder {
  id: string;
  order_number: string;
  total: number;
  delivered_at: string | null;
  user: ReviewOrderUser;
  items: ReviewOrderItem[];
}

export interface Review {
  id: string;
  order_id: string;
  review_token: string;
  admin_caption: string;
  rating: number | null;
  comment: string | null;
  customer_name: string | null;
  status: ReviewStatus;
  is_featured: boolean;
  submitted_at: string | null;
  created_at: string;
  review_link: string;
  media: ReviewMedia[];
  order: ReviewOrder;
}

export interface ReviewPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReviewListResponse {
  success: boolean;
  data: Review[];
  pagination: ReviewPagination;
}

export interface ReviewFilters {
  status?: ReviewStatus;
  is_featured?: boolean;
  page?: number;
  limit?: number;
}

// ===== Admin create/update =====
export interface CreateReviewData {
  admin_caption: string;
}

export interface UpdateReviewData {
  status?: ReviewStatus;
  is_featured?: boolean;
  admin_caption?: string;
}

// ===== Customer submit =====
export interface SubmitReviewData {
  rating: number;
  comment?: string;
  customer_name?: string;
}

// ===== Status display =====
export const REVIEW_STATUSES = [
  { value: 'pending' as ReviewStatus, label: 'Pendiente', color: 'bg-yellow-500' },
  { value: 'submitted' as ReviewStatus, label: 'Enviada', color: 'bg-blue-500' },
  { value: 'published' as ReviewStatus, label: 'Publicada', color: 'bg-green-500' },
  { value: 'hidden' as ReviewStatus, label: 'Oculta', color: 'bg-gray-500' },
] as const;
