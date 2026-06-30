import api from './api';
import type { UsersResponse } from '../types/users';

export const userService = {
  getUsers: async (page: number = 1, limit: number = 20, search: string = ''): Promise<UsersResponse> => {
    let url = `/users?page=${page}&limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    const response = await api.get(url);
    return response.data;
  }
};
