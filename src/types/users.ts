export interface UserCount {
  orders: number;
}

export interface UserOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  is_active: boolean;
  profile_completed: boolean;
  created_at: string;
  last_login: string;
  _count: UserCount;
  orders?: UserOrder[];
}

export interface UsersResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
