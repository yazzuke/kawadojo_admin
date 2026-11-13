import api from './api';
import type { UsersResponse } from '../types/users';

export const userService = {
  // filters: source (web | manual), orders (with | without), sort (newest | oldest | most_orders | last_login)
  getUsers: async (
    page: number = 1,
    limit: number = 20,
    search: string = '',
    filters: { source?: string; orders?: string; sort?: string } = {},
  ): Promise<UsersResponse> => {
    const params: Record<string, string | number> = { page, limit };
    if (search) params.search = search;
    for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
    const response = await api.get('/users', { params });
    return response.data;
  }
};
