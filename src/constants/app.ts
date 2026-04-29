export type AppPage =
  | 'home'
  | 'deals'
  | 'product-details'
  | 'user-orders'
  | 'admin-orders'
  | 'admin-products'
  | 'admin-billing'
  | 'admin-catalog'
  | 'admin-suppliers'
  | 'supplier-products'
  | 'supplier-orders';

export const STORAGE_SESSION = 'react_shop_session';
export const STORAGE_CART = 'react_shop_cart';
export const STORAGE_UI_SETTINGS = 'react_shop_ui_settings';
export const STORAGE_DELIVERY_LOCATION = 'react_shop_delivery_location';
export const STORAGE_PROFILE_PHOTO = 'react_shop_profile_photo';
export const STORAGE_SHOP_CACHE = 'react_shop_catalog_shop_cache';
export const STORAGE_PRODUCTS_CACHE = 'react_shop_catalog_products_cache';

export const UNIT_OPTIONS = ['kg', 'g', 'mg', 'ltr', 'ml', 'pcs', 'dozen', 'pack', 'box'];
export const ORDER_STATUSES = ['pending', 'confirmed', 'packed', 'out_for_delivery', 'cancelled'];
export const ORDER_FLOW_STATUSES = ['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered'] as const;
export const LOW_STOCK_THRESHOLD = 5;
export const ADMIN_PRODUCTS_BATCH_SIZE = 60;
export const LOW_STOCK_CAROUSEL_LIMIT = 40;
export const ECOMMERCE_DEFAULT_CATEGORIES = ['Vegetables', 'Fruits', 'Dairy', 'Bakery', 'Essentials'];
export const SUPPLY_ORDER_STATUS_OPTIONS = ['pending', 'accepted', 'rejected', 'fulfilled'] as const;

export const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const COUNTRY_CODE_REGEX = /^\+[1-9][0-9]{0,3}$/;
export const PHONE_REGEX = /^[0-9]{6,14}$/;
export const PHONE_MAX_LENGTH = 14;
export const COUNTRY_CODE_MAX_LENGTH = 5;
