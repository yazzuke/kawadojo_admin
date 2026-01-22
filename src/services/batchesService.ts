import api from './api';
import type { 
  Batch, 
  BatchWithMetrics,
  BatchSummary, 
  CreateBatchData, 
  UpdateBatchData, 
  UpdateBatchStatusData 
} from '../types/batch';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const batchesService = {
  async getAll(filters?: { status?: string }): Promise<Batch[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    
    const response = await api.get<ApiResponse<Batch[]>>(`/batches?${params.toString()}`);
    return response.data.data;
  },

  async getById(id: string): Promise<Batch> {
    const response = await api.get<ApiResponse<Batch>>(`/batches/${id}`);
    return response.data.data;
  },

  async getMetrics(id: string): Promise<BatchWithMetrics> {
    const response = await api.get<ApiResponse<BatchWithMetrics>>(`/batches/${id}/metrics`);
    return response.data.data;
  },

  async getSummary(): Promise<BatchSummary> {
    const response = await api.get<ApiResponse<BatchSummary>>('/batches/summary');
    return response.data.data;
  },

  async create(data: CreateBatchData): Promise<Batch> {
    const response = await api.post<ApiResponse<Batch>>('/batches', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateBatchData): Promise<Batch> {
    const response = await api.put<ApiResponse<Batch>>(`/batches/${id}`, data);
    return response.data.data;
  },

  async updateStatus(id: string, data: UpdateBatchStatusData): Promise<Batch> {
    const response = await api.patch<ApiResponse<Batch>>(`/batches/${id}/status`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/batches/${id}`);
  },

  async deleteItems(batchId: string, itemIds: string[], force: boolean = false): Promise<void> {
    await api.delete(`/batches/${batchId}/items`, {
      data: { item_ids: itemIds, force }
    });
  },

  async addItems(batchId: string, items: Array<{ product_id: string; quantity: number; unit_cost: number }>): Promise<void> {
    await api.post(`/batches/${batchId}/items`, { items });
  },

  async updateItemQuantity(batchId: string, itemId: string, quantity: number): Promise<void> {
    await api.patch(`/batches/${batchId}/items/${itemId}`, { quantity });
  },

  async moveItem(fromBatchId: string, itemId: string, toBatchId: string, unitCost?: number): Promise<any> {
    const response = await api.post(`/batches/${fromBatchId}/items/${itemId}/move`, {
      to_batch_id: toBatchId,
      unit_cost: unitCost
    });
    return response.data.data;
  }
};
