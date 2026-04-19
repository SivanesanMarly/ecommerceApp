export function emptyAdminProductForm() {
  return {
    name: '',
    description: '',
    short_description: '',
    category: 'Vegetables',
    subcategory: '',
    brand: '',
    slug: '',
    currency: 'INR',
    tax_percent: 0,
    stock_status: 'in_stock',
    price: 100,
    compare_at_price: 120,
    rating: 4,
    inventory: 10,
    unit: 'pcs',
    unit_value: 1,
    image: null as File | null,
  };
}

export function emptySupplierCreateForm() {
  return {
    username: '',
    email: '',
    country_code: '+91',
    phone: '',
    address: '',
    password: '',
  };
}

export function emptySupplyCreateForm() {
  return {
    product_id: '',
    unit_value: 10,
    notes: '',
  };
}

export function emptySupplierProductForm() {
  return {
    name: '',
    description: '',
    category: 'Supply',
    price: 100,
    inventory: 10,
    unit: 'pcs',
    unit_value: 1,
    image: null as File | null,
  };
}
