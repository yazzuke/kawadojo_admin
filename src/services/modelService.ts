import api from './api';
import type { CompatibleModel } from '../types/product';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface CreateModelData {
  name: string;
  logo: File;
}

export const modelService = {
  async getAll(): Promise<CompatibleModel[]> {
    const response = await api.get<ApiResponse<CompatibleModel[]>>('/moto-models');
    return response.data.data;
  },

  async create(data: CreateModelData): Promise<CompatibleModel> {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('logo', data.logo);

    const response = await api.post<ApiResponse<CompatibleModel>>('/moto-models', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/moto-models/${id}`);
  },
};
