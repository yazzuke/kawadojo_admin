import api from './api';
import type { Product, CreateProductData } from '../types/product';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const productService = {
  async getAll(): Promise<Product[]> {
    const response = await api.get<ApiResponse<Product[]>>('/products');
    return response.data.data;
  },

  async getById(id: string): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data;
  },

  async create(data: CreateProductData): Promise<Product> {
    const formData = new FormData();
    
    formData.append('name', data.name);
    formData.append('slug', data.slug);
    formData.append('price', data.price.toString());
    if (data.cost !== undefined) formData.append('cost', data.cost.toString());
    formData.append('description', data.description);
    formData.append('condition', data.condition);
    formData.append('in_stock', data.in_stock.toString());
    formData.append('is_original', data.is_original.toString());
    formData.append('source', data.source);
    formData.append('category_id', data.category_id);
    
    // Compatible models es un array de IDs
    data.compatible_models.forEach((modelId) => {
      formData.append('compatible_models', modelId);
    });
    
    // Imágenes
    data.images.forEach((image) => {
      formData.append('images', image);
    });

    const response = await api.post<ApiResponse<Product>>('/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async update(id: string, data: Partial<CreateProductData>): Promise<Product> {
    const formData = new FormData();
    
    if (data.name) formData.append('name', data.name);
    if (data.slug) formData.append('slug', data.slug);
    if (data.price) formData.append('price', data.price.toString());
    if (data.cost !== undefined) formData.append('cost', data.cost.toString());
    if (data.description) formData.append('description', data.description);
    if (data.condition) formData.append('condition', data.condition);
    if (data.in_stock !== undefined) formData.append('in_stock', data.in_stock.toString());
    if (data.is_original !== undefined) formData.append('is_original', data.is_original.toString());
    if (data.source) formData.append('source', data.source);
    if (data.category_id) formData.append('category_id', data.category_id);
    
    if (data.compatible_models) {
      data.compatible_models.forEach((modelId) => {
        formData.append('compatible_models', modelId);
      });
    }
    
    if (data.images) {
      data.images.forEach((image) => {
        formData.append('images', image);
      });
    }

    const response = await api.put<ApiResponse<Product>>(`/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};
