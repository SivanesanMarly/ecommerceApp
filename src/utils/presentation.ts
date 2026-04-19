import { COUNTRY_CODE_MAX_LENGTH, ORDER_FLOW_STATUSES, PHONE_MAX_LENGTH } from '../constants/app';
import type { OrderDetail, Product, SupplyOrder } from '../types';

const INVALID_LABEL_VALUES = new Set([
  '',
  'n/a',
  'na',
  '~n/a~',
  'null',
  'none',
  'undefined',
  '-',
  '--',
]);

type TimelineStep = {
  status: string;
  timestamp: string;
  isDone: boolean;
  isCurrent: boolean;
  tone: 'green' | 'red' | 'amber' | 'blue';
};

export function allowedAdminSupplyTransitions(status: SupplyOrder['status']): SupplyOrder['status'][] {
  if (status === 'pending') return ['accepted', 'rejected'];
  if (status === 'accepted') return ['fulfilled'];
  return [];
}

export function allowedAdminOrderTransitions(status: string): string[] {
  const normalized = status.toLowerCase();
  if (normalized === 'pending') return ['confirmed', 'cancelled'];
  if (normalized === 'confirmed') return ['packed', 'cancelled'];
  if (normalized === 'packed') return ['out_for_delivery', 'cancelled'];
  if (normalized === 'out_for_delivery') return ['cancelled'];
  return [];
}

export function allowedSupplierSupplyTransitions(status: SupplyOrder['status']): SupplyOrder['status'][] {
  if (status === 'pending') return ['accepted', 'rejected'];
  return [];
}

export function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

export function defaultExpectedDeliveryLocal() {
  const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('deliver') || normalized === 'fulfilled') return 'status green';
  if (normalized.includes('reject') || normalized.includes('cancel')) return 'status red';
  if (normalized.includes('pending')) return 'status amber';
  return 'status blue';
}

function statusTone(status: string): 'green' | 'red' | 'amber' | 'blue' {
  const normalized = status.toLowerCase();
  if (normalized.includes('deliver') || normalized === 'fulfilled') return 'green';
  if (normalized.includes('reject') || normalized.includes('cancel')) return 'red';
  if (normalized.includes('pending')) return 'amber';
  return 'blue';
}

export function formatStatusText(status: string) {
  const normalized = status.trim().toLowerCase();
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    packed: 'Packed',
    out_for_delivery: 'Out For Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    accepted: 'Accepted',
    rejected: 'Rejected',
    fulfilled: 'Fulfilled',
  };
  if (statusMap[normalized]) return statusMap[normalized];
  return normalized
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function displayName(value?: string | null, fallback = 'User') {
  const normalized = (value || '').trim();
  return normalized || fallback;
}

export function sanitizePhoneInput(value: string) {
  return value.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH);
}

export function sanitizeCountryCodeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, COUNTRY_CODE_MAX_LENGTH - 1);
  return digits ? `+${digits}` : '+';
}

export function buildOrderTimelineSteps(order: OrderDetail): TimelineStep[] {
  const normalizedStatus = order.status.trim().toLowerCase();
  const timeline = new Map<string, string>();
  (order.status_timeline || []).forEach((event) => {
    const key = event.status.trim().toLowerCase();
    if (!key || timeline.has(key)) return;
    timeline.set(key, event.timestamp);
  });
  if (!timeline.has('pending')) {
    timeline.set('pending', order.created_at);
  }

  if (normalizedStatus === 'cancelled') {
    return [{
      status: 'cancelled',
      timestamp: timeline.get('cancelled') || order.created_at,
      isDone: true,
      isCurrent: true,
      tone: 'red',
    }];
  }

  const currentIndex = ORDER_FLOW_STATUSES.indexOf(normalizedStatus as (typeof ORDER_FLOW_STATUSES)[number]);
  const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;

  return ORDER_FLOW_STATUSES.map((step, index) => {
    const isDone = index <= resolvedIndex;
    return {
      status: step,
      timestamp: timeline.get(step) || '',
      isDone,
      isCurrent: index === resolvedIndex,
      tone: statusTone(step),
    };
  });
}

export function buildSupplyTimelineSteps(order: SupplyOrder): TimelineStep[] {
  const normalizedStatus = order.status.trim().toLowerCase();
  const steps = normalizedStatus === 'rejected'
    ? ['pending', 'rejected']
    : ['pending', 'accepted', 'fulfilled'];
  const timeline = new Map<string, string>();

  if (order.created_at) timeline.set('pending', order.created_at);
  if (order.accepted_at) timeline.set('accepted', order.accepted_at);
  if (normalizedStatus && normalizedStatus !== 'pending') {
    timeline.set(normalizedStatus, order.updated_at || order.created_at);
  }

  const currentIndex = Math.max(0, steps.indexOf(normalizedStatus));
  return steps.map((step, index) => ({
    status: step,
    timestamp: timeline.get(step) || '',
    isDone: index <= currentIndex,
    isCurrent: index === currentIndex,
    tone: statusTone(step),
  }));
}

export function productGradient(product: Product) {
  const tones: Record<string, [string, string]> = {
    vegetables: ['#364f6b', '#4f6d8a'],
    fruits: ['#43535f', '#5f7283'],
    dairy: ['#465465', '#6a7c92'],
    bakery: ['#4d5667', '#6f7d93'],
    essentials: ['#304154', '#4f6278'],
    supply: ['#2f4d59', '#4f7384'],
  };
  const key = product.category.trim().toLowerCase();
  const [start, end] = tones[key] || ['#2f3f5f', '#5a6c85'];
  return `linear-gradient(135deg, ${start}, ${end})`;
}

export function parseCategoryLevels(category: string) {
  const normalizedCategory = productCategoryLabel(category, '');
  const normalized = normalizedCategory
    .split(/>|\/|\||::/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (normalized.length >= 2) return { department: normalized[0], collection: normalized[1] };
  if (normalized.length === 1) return { department: normalized[0], collection: 'Featured' };
  return { department: 'General', collection: 'Featured' };
}

function normalizeCatalogLabel(value?: string | null) {
  const normalized = (value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';
  if (INVALID_LABEL_VALUES.has(normalized.toLowerCase())) return '';
  return normalized;
}

export function productDisplayName(value?: string | null, fallback = 'Product') {
  const normalized = normalizeCatalogLabel(value);
  if (!normalized) return fallback;
  return normalized;
}

export function productCategoryLabel(value?: string | null, fallback = 'General') {
  return normalizeCatalogLabel(value) || fallback;
}

export function productSubcategoryLabel(value?: string | null, fallback = 'Featured') {
  return normalizeCatalogLabel(value) || fallback;
}

export function productBrandLabel(value?: string | null, fallback = '') {
  return normalizeCatalogLabel(value) || fallback;
}
