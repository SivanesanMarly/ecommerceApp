export type UserRole = 'user' | 'admin' | 'supplier';

export interface Shop {
  id: string;
  name: string;
  tagline: string;
  rating: number;
  review_count: number;
  is_open: boolean;
  eta_minutes: number;
  location: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  short_description?: string | null;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  price: number;
  compare_at_price: number;
  rating: number;
  inventory: number;
  featured_score: number;
  color_hex: string;
  unit: string;
  unit_value: number;
  image_url: string;
  currency?: string | null;
  slug?: string | null;
  tax_percent?: number | null;
  discount_percent?: number | null;
  stock_status?: string | null;
  deal_enabled?: boolean | null;
  deal_starts_at?: string | null;
  deal_ends_at?: string | null;
  deal_priority?: number | null;
  deal_badge?: string | null;
  supplier_user_id?: string | null;
  supplier_name?: string | null;
}

export interface Session {
  token: string;
  user_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string;
}

export interface OrderHistoryItem {
  order_id: string;
  total_amount: number;
  status: string;
  admin_email_notified: boolean;
  items: string[];
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
}

export interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface StatusEvent {
  status: string;
  timestamp: string;
}

export interface OrderDetail {
  order_id: string;
  total_amount: number;
  status: string;
  admin_email_notified: boolean;
  created_at: string;
  items: OrderItem[];
  status_timeline: StatusEvent[];
  customer_name?: string;
  customer_phone?: string;
}

export interface Supplier {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

export interface SupplyOrderItem {
  product_id: string;
  product_name: string;
  unit: string;
  requested_unit_value: number;
  price: number;
}

export interface SupplyOrder {
  supply_order_id: string;
  supplier_user_id: string;
  supplier_name: string;
  created_by_admin_user_id: string;
  created_by_admin_name: string;
  title: string;
  notes: string;
  quantity: number;
  status: 'pending' | 'accepted' | 'rejected' | 'fulfilled';
  updated_by_role: string;
  expected_delivery_at: string | null;
  accepted_at: string | null;
  items: SupplyOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface NotificationPayload {
  unread_count: number;
  items: Array<{
    id: string;
    title: string;
    message: string;
    event: string;
    is_read: boolean;
    created_at: string;
  }>;
}

export interface CatalogImportSummary {
  source_label: string;
  sheet_name: string;
  assign_supplier_strategy: 'none' | 'round_robin' | string;
  only_active: boolean;
  sync_missing: boolean;
  dry_run: boolean;
  created: number;
  updated: number;
  skipped: number;
  reactivated: number;
  duplicate_external_keys: number;
  deactivated_by_sync: number;
  errors: string[];
}

export interface ProductDetailRecord {
  name: string;
  short_description: string;
  description: string;
  brand: string;
  category: string;
  subcategory: string;
  barcode: string;
  price: number;
  compare_at_price: number;
  cost_price: number;
  currency: string;
  tax_inclusive: boolean;
  tax_percent: number;
  inventory: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  allow_backorder: boolean;
  unit: string;
  unit_value: number;
  weight_g: number;
  length_cm: number | '';
  width_cm: number | '';
  height_cm: number | '';
  image_url: string;
  status: 'active' | 'inactive';
  supplier_user_id: string;
  slug: string;
}
