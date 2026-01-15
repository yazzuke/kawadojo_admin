import api from './api';
import type { Category } from '../types/product';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const response = await api.get<ApiResponse<Category[]>>('/categories');
    return response.data.data;
  },
};
