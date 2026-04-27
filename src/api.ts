import axios from 'axios';
import type {
  CatalogImportSummary,
  NotificationPayload,
  OrderDetail,
  OrderHistoryItem,
  Product,
  Session,
  Shop,
  Supplier,
  SupplyOrder,
} from './types';

const BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL?.trim() ||
  'http://localhost:8000';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  baseUrl: BASE_URL,

  async getShop() {
    const { data } = await http.get<Shop>('/api/shop');
    return data;
  },

  async getProductsPage(limit = 200, offset = 0) {
    const safeLimit = Math.min(200, Math.max(1, Math.trunc(limit)));
    const safeOffset = Math.max(0, Math.trunc(offset));
    const response = await http.get<Product[]>(
      `/api/products?limit=${safeLimit}&offset=${safeOffset}`,
    );
    const totalHeader = response.headers['x-total-count'];
    const parsedTotal = Number.parseInt(
      Array.isArray(totalHeader) ? totalHeader[0] ?? '' : String(totalHeader ?? ''),
      10,
    );
    const totalCount = Number.isFinite(parsedTotal) ? parsedTotal : safeOffset + response.data.length;
    return {
      items: response.data,
      totalCount,
      limit: safeLimit,
      offset: safeOffset,
      hasMore: safeOffset + response.data.length < totalCount,
    };
  },

  async getProducts() {
    // Prefer backend "all products" response in one request.
    // Both backend variants in this project support /api/products with no limit.
    try {
      const { data } = await http.get<Product[]>('/api/products');
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {
      // Fallback to paged fetch below.
    }

    const pageSize = 200;
    const products: Product[] = [];
    let offset = 0;

    while (true) {
      const page = await api.getProductsPage(pageSize, offset);
      products.push(...page.items);
      if (!page.hasMore || page.items.length === 0) {
        break;
      }
      offset += page.items.length;
    }

    return products;
  },

  async login(identifier: string, password: string) {
    const { data } = await http.post<Session>('/api/auth/user/login', {
      identifier,
      password,
    });
    return data;
  },

  async continueWithGoogle(idToken: string) {
    const token = idToken.trim();
    if (!token) {
      throw new Error('Google credential is missing. Please try again.');
    }
    const { data } = await http.post<Session>('/api/auth/google/login', { id_token: token });
    return data;
  },

  async logout(token: string) {
    await http.post('/api/auth/logout', {}, {
      headers: authHeader(token),
    });
  },

  async adminLogin(payload: {
    email: string;
    phone: string;
    password: string;
    shop_name: string;
    shop_location: string;
  }) {
    const { data } = await http.post<Session>('/api/auth/admin/login', payload);
    return data;
  },

  async registerUser(payload: {
    username: string;
    email: string;
    country_code: string;
    phone: string;
    password: string;
  }) {
    await http.post('/api/auth/register/user', payload);
  },

  async forgotPassword(email: string) {
    const { data } = await http.post<{ message: string }>('/api/auth/forgot-password', { email });
    return data;
  },

  async verifyResetOtp(email: string, otp: string) {
    const { data } = await http.post<{ message: string }>('/api/auth/verify-reset-otp', {
      email,
      otp,
    });
    return data;
  },

  async resetPassword(email: string, otp: string, newPassword: string) {
    const { data } = await http.post<{ message: string }>('/api/auth/reset-password', {
      email,
      otp,
      new_password: newPassword,
    });
    return data;
  },

  async setPassword(
    token: string,
    payload: { newPassword: string; currentPassword?: string },
  ) {
    const { data } = await http.post<{ message: string }>(
      '/api/auth/set-password',
      {
        new_password: payload.newPassword,
        current_password: payload.currentPassword,
      },
      { headers: authHeader(token) },
    );
    return data;
  },

  async checkout(token: string, cart: Record<string, number>) {
    const items = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }));

    const { data } = await http.post(
      '/api/orders/checkout',
      { items },
      { headers: authHeader(token) },
    );
    return data;
  },

  async getOrderHistory(token: string) {
    const { data } = await http.get<OrderHistoryItem[]>('/api/orders/history', {
      headers: authHeader(token),
    });
    return data;
  },

  async getOrderDetail(token: string, orderId: string) {
    const { data } = await http.get<OrderDetail>(`/api/orders/${orderId}`, {
      headers: authHeader(token),
    });
    return data;
  },

  async confirmDelivered(token: string, orderId: string) {
    const { data } = await http.post<OrderDetail>(
      `/api/orders/${orderId}/confirm-delivered`,
      {},
      { headers: authHeader(token) },
    );
    return data;
  },

  async getAdminOrders(token: string) {
    const { data } = await http.get<OrderHistoryItem[]>('/api/admin/orders', {
      headers: authHeader(token),
    });
    return data;
  },

  async getAdminOrderDetail(token: string, orderId: string) {
    const { data } = await http.get<OrderDetail>(`/api/admin/orders/${orderId}`, {
      headers: authHeader(token),
    });
    return data;
  },

  async updateAdminOrderStatus(token: string, orderId: string, status: string) {
    const { data } = await http.post<OrderDetail>(
      `/api/admin/orders/${orderId}/status`,
      { status },
      { headers: authHeader(token) },
    );
    return data;
  },

  async updateShop(token: string, payload: {
    name: string;
    tagline: string;
    location: string;
    eta_minutes: number;
    is_open: boolean;
  }) {
    const { data } = await http.post<Shop>('/api/admin/shop/update', payload, {
      headers: authHeader(token),
    });
    return data;
  },

  async createAdminProduct(
    token: string,
    payload: {
      name: string;
      description: string;
      short_description?: string;
      category: string;
      subcategory?: string;
      brand?: string;
      slug?: string;
      currency?: string;
      tax_percent?: number;
      stock_status?: string;
      price: number;
      compare_at_price: number;
      rating: number;
      inventory: number;
      unit: string;
      unit_value: number;
      image?: File | null;
    },
  ) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === 'image' && v instanceof File) {
        fd.append('image', v);
      } else {
        fd.append(k, String(v));
      }
    });
    const { data } = await http.post<Product>('/api/admin/products', fd, {
      headers: authHeader(token),
    });
    return data;
  },

  async deleteAdminProduct(token: string, productId: string) {
    await http.delete(`/api/admin/products/${productId}`, {
      headers: authHeader(token),
    });
  },

  async updateAdminProduct(
    token: string,
    productId: string,
    payload: {
      name: string;
      description: string;
      short_description?: string;
      category: string;
      subcategory?: string;
      brand?: string;
      slug?: string;
      currency?: string;
      tax_percent?: number;
      stock_status?: string;
      price: number;
      compare_at_price: number;
      rating: number;
      inventory: number;
      unit: string;
      unit_value: number;
      image?: File | null;
    },
  ) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === 'image' && v instanceof File) {
        fd.append('image', v);
      } else {
        fd.append(k, String(v));
      }
    });
    const { data } = await http.put<Product>(`/api/admin/products/${productId}`, fd, {
      headers: authHeader(token),
    });
    return data;
  },

  async updateAdminProductDeal(
    token: string,
    productId: string,
    payload: {
      enabled: boolean;
      discount_percent?: number;
      starts_at?: string | null;
      ends_at?: string | null;
      priority?: number;
      badge?: string;
    },
  ) {
    const { data } = await http.post<Product>(`/api/admin/products/${productId}/deal`, payload, {
      headers: authHeader(token),
    });
    return data;
  },

  async getSuppliers(token: string) {
    const { data } = await http.get<Supplier[]>('/api/admin/suppliers', {
      headers: authHeader(token),
    });
    return data;
  },

  async createSupplier(
    token: string,
    payload: {
      username: string;
      email: string;
      country_code: string;
      phone: string;
      address: string;
      password: string;
    },
  ) {
    await http.post('/api/admin/suppliers', payload, {
      headers: authHeader(token),
    });
  },

  async getAdminSupplierProducts(token: string, supplierUserId?: string) {
    const query = supplierUserId
      ? `?supplier_user_id=${encodeURIComponent(supplierUserId)}`
      : '';
    const { data } = await http.get<Product[]>(`/api/admin/supplier-products${query}`, {
      headers: authHeader(token),
    });
    return data;
  },

  async createSupplyOrder(
    token: string,
    payload: {
      supplier_user_id: string;
      notes: string;
      items: Array<{ product_id: string; unit_value: number }>;
    },
  ) {
    const { data } = await http.post<SupplyOrder>('/api/admin/supply-orders', payload, {
      headers: authHeader(token),
    });
    return data;
  },

  async getAdminSupplyOrders(token: string, supplierUserId?: string) {
    const query = supplierUserId
      ? `?supplier_user_id=${encodeURIComponent(supplierUserId)}`
      : '';
    const { data } = await http.get<SupplyOrder[]>(`/api/admin/supply-orders${query}`, {
      headers: authHeader(token),
    });
    return data;
  },

  async updateAdminSupplyOrderStatus(
    token: string,
    id: string,
    payload: { status: string; notes?: string; expected_delivery_at?: string },
  ) {
    const { data } = await http.post<SupplyOrder>(
      `/api/admin/supply-orders/${id}/status`,
      payload,
      { headers: authHeader(token) },
    );
    return data;
  },

  async getSupplierProducts(token: string) {
    const { data } = await http.get<Product[]>('/api/supplier/products', {
      headers: authHeader(token),
    });
    return data;
  },

  async createSupplierProduct(
    token: string,
    payload: {
      name: string;
      description: string;
      category: string;
      price: number;
      inventory: number;
      unit: string;
      unit_value: number;
      image?: File | null;
    },
  ) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === 'image' && v instanceof File) {
        fd.append('image', v);
      } else {
        fd.append(k, String(v));
      }
    });

    const { data } = await http.post<Product>('/api/supplier/products', fd, {
      headers: authHeader(token),
    });
    return data;
  },

  async deleteSupplierProduct(token: string, productId: string) {
    await http.delete(`/api/supplier/products/${productId}`, {
      headers: authHeader(token),
    });
  },

  async updateSupplierProduct(
    token: string,
    productId: string,
    payload: {
      name: string;
      description: string;
      category: string;
      price: number;
      inventory: number;
      unit: string;
      unit_value: number;
      image?: File | null;
    },
  ) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === 'image' && v instanceof File) {
        fd.append('image', v);
      } else {
        fd.append(k, String(v));
      }
    });
    const { data } = await http.put<Product>(`/api/supplier/products/${productId}`, fd, {
      headers: authHeader(token),
    });
    return data;
  },

  async getSupplierSupplyOrders(token: string) {
    const { data } = await http.get<SupplyOrder[]>('/api/supplier/supply-orders', {
      headers: authHeader(token),
    });
    return data;
  },

  async updateSupplierSupplyOrderStatus(
    token: string,
    id: string,
    payload: { status: string; notes: string; expected_delivery_at?: string },
  ) {
    const { data } = await http.post<SupplyOrder>(
      `/api/supplier/supply-orders/${id}/status`,
      payload,
      { headers: authHeader(token) },
    );
    return data;
  },

  async getUnreadNotifications(token: string) {
    const { data } = await http.get<NotificationPayload>('/api/notifications/unread', {
      headers: authHeader(token),
    });
    return data;
  },

  async markNotificationsRead(token: string) {
    await http.post('/api/notifications/read-all', {}, { headers: authHeader(token) });
  },

  async importAdminCatalogExcel(
    token: string,
    payload: {
      file: File;
      source_label?: string;
      sheet_name?: string;
      assign_supplier_strategy?: 'none' | 'round_robin';
      sync_missing?: boolean;
      only_active?: boolean;
      dry_run?: boolean;
    },
  ) {
    const fd = new FormData();
    fd.append('file', payload.file);
    if (payload.source_label) fd.append('source_label', payload.source_label);
    if (payload.sheet_name) fd.append('sheet_name', payload.sheet_name);
    if (payload.assign_supplier_strategy) fd.append('assign_supplier_strategy', payload.assign_supplier_strategy);
    if (typeof payload.sync_missing === 'boolean') fd.append('sync_missing', String(payload.sync_missing));
    if (typeof payload.only_active === 'boolean') fd.append('only_active', String(payload.only_active));
    if (typeof payload.dry_run === 'boolean') fd.append('dry_run', String(payload.dry_run));
    const { data } = await http.post<CatalogImportSummary>('/api/admin/catalog/import-excel', fd, {
      headers: authHeader(token),
      timeout: 120000,
    });
    return data;
  },
};

export function getApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Something went wrong';
}
