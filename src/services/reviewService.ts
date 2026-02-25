import api from './api';
import axios from 'axios';
import type {
  Review,
  ReviewListResponse,
  ReviewFilters,
  CreateReviewData,
  UpdateReviewData,
  ReviewTokenData,
  PublicTestimonial,
  SubmitReviewData,
} from '../types/review';

const API_URL = api.defaults.baseURL;

export const reviewService = {
  // ===================== ADMIN (auth required) =====================

  /** List reviews with filters and pagination */
  async getAll(filters?: ReviewFilters): Promise<ReviewListResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.is_featured !== undefined) params.append('is_featured', String(filters.is_featured));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await api.get(`/reviews?${params.toString()}`);
    return response.data;
  },

  /** Create a review for an order */
  async create(orderId: string, data: CreateReviewData): Promise<Review> {
    const response = await api.post(`/reviews/order/${orderId}`, data);
    return response.data.data ?? response.data;
  },

  /** Update review (publish, feature, change status) */
  async update(id: string, data: UpdateReviewData): Promise<Review> {
    const response = await api.put(`/reviews/${id}`, data);
    return response.data.data ?? response.data;
  },

  /** Upload media as admin */
  async uploadMedia(id: string, file: File, caption?: string): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);

    await api.post(`/reviews/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Regenerate review token */
  async regenerateToken(id: string): Promise<{ review_token: string }> {
    const response = await api.post(`/reviews/${id}/regenerate-token`);
    return response.data.data ?? response.data;
  },

  /** Delete a media item */
  async deleteMedia(mediaId: string): Promise<void> {
    await api.delete(`/reviews/media/${mediaId}`);
  },

  /** Delete a review */
  async delete(id: string): Promise<void> {
    await api.delete(`/reviews/${id}`);
  },

  // ===================== PUBLIC (no auth) =====================

  /** Get review data by token (customer landing page) */
  async getByToken(token: string): Promise<ReviewTokenData> {
    const response = await axios.get(`${API_URL}/reviews/token/${token}`);
    return response.data.data ?? response.data;
  },

  /** Submit customer review */
  async submitByToken(token: string, data: SubmitReviewData): Promise<void> {
    await axios.post(`${API_URL}/reviews/token/${token}/submit`, data);
  },

  /** Upload customer media */
  async uploadCustomerMedia(token: string, file: File, caption?: string): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);

    await axios.post(`${API_URL}/reviews/token/${token}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Get published testimonials */
  async getPublic(limit = 10): Promise<PublicTestimonial[]> {
    const response = await axios.get(`${API_URL}/reviews/public?limit=${limit}`);
    return response.data.data ?? response.data;
  },
};
