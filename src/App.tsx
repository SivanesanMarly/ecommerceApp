import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './index.css';
import { api, getApiError } from './api';
import { AppIcon } from './components/common/AppIcon';
import { AdminCatalogPage } from './pages/admin/AdminCatalogPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { UserOrdersPage } from './pages/user/UserOrdersPage';
import {
  COUNTRY_CODE_MAX_LENGTH,
  COUNTRY_CODE_REGEX,
  ECOMMERCE_DEFAULT_CATEGORIES,
  EMAIL_REGEX,
  LOW_STOCK_CAROUSEL_LIMIT,
  LOW_STOCK_THRESHOLD,
  ORDER_STATUSES,
  PHONE_MAX_LENGTH,
  PHONE_REGEX,
  STORAGE_CART,
  STORAGE_SESSION,
  STORAGE_UI_SETTINGS,
  SUPPLY_ORDER_STATUS_OPTIONS,
  UNIT_OPTIONS,
  type AppPage,
} from './constants/app';
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
import {
  emptyAdminProductForm,
  emptySupplierCreateForm,
  emptySupplierProductForm,
  emptySupplyCreateForm,
} from './utils/forms';
import {
  allowedAdminOrderTransitions,
  allowedAdminSupplyTransitions,
  allowedSupplierSupplyTransitions,
  buildOrderTimelineSteps,
  buildSupplyTimelineSteps,
  defaultExpectedDeliveryLocal,
  displayName,
  formatStatusText,
  formatTime,
  money,
  parseCategoryLevels,
  productBrandLabel,
  productCategoryLabel,
  productDisplayName,
  productSubcategoryLabel,
  productGradient,
  sanitizeCountryCodeInput,
  sanitizePhoneInput,
  statusClass,
} from './utils/presentation';

type Cart = Record<string, number>;
const brandLogo = '/app_logo.jpeg';
const STOREFRONT_PRODUCTS_PER_PAGE = 16;
const ADMIN_PRODUCTS_PER_PAGE = 24;

function App() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [, setLoading] = useState(true);
  const [, setError] = useState('');

  const [session, setSession] = useState<Session | null>(null);
  const [cart, setCart] = useState<Cart>({});

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [subcategory, setSubcategory] = useState('All');
  const [storefrontProductsPage, setStorefrontProductsPage] = useState(1);
  const [storefrontScreen, setStorefrontScreen] = useState<'departments' | 'collections' | 'products'>('departments');
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'preferences' | 'shop' | 'actions' | 'shortcuts'>('preferences');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [adminDrawerSections, setAdminDrawerSections] = useState({
    recent: true,
  });
  const [supplierDrawerSections, setSupplierDrawerSections] = useState({
    recent: true,
  });
  const [userDrawerSections, setUserDrawerSections] = useState({
    recent: true,
  });
  const [activePage, setActivePage] = useState<AppPage>('home');

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [regForm, setRegForm] = useState({
    username: '',
    email: '',
    country_code: '+91',
    phone: '',
    password: '',
  });
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [googleAuthBusy, setGoogleAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const googleSignInMountRef = useRef<HTMLDivElement | null>(null);

  const [history, setHistory] = useState<OrderHistoryItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<Supplier | null>(null);

  const [adminOrders, setAdminOrders] = useState<OrderHistoryItem[]>([]);
  const [adminSupplyOrders, setAdminSupplyOrders] = useState<SupplyOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const [supplierOwnProducts, setSupplierOwnProducts] = useState<Product[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplyOrder[]>([]);
  const [supplierExpectedDeliveryDrafts, setSupplierExpectedDeliveryDrafts] = useState<Record<string, string>>({});

  const [notice, setNotice] = useState<NotificationPayload>({ unread_count: 0, items: [] });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [toast, setToast] = useState('');

  const [adminProductForm, setAdminProductForm] = useState(emptyAdminProductForm);
  const [adminProductBusy, setAdminProductBusy] = useState(false);
  const [adminProductDeletingId, setAdminProductDeletingId] = useState<string | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);
  const [editingAdminProductId, setEditingAdminProductId] = useState<string | null>(null);
  const [showAdminProductForm, setShowAdminProductForm] = useState(false);
  const [adminProductsSearch, setAdminProductsSearch] = useState('');
  const [adminProductsCategoryFilter, setAdminProductsCategoryFilter] = useState('All');
  const [adminProductsStockFilter, setAdminProductsStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [adminProductsPage, setAdminProductsPage] = useState(1);
  const [adminOrderStatusUpdatingId, setAdminOrderStatusUpdatingId] = useState<string | null>(null);
  const [adminOrdersSearch, setAdminOrdersSearch] = useState('');
  const [adminOrdersStatusFilter, setAdminOrdersStatusFilter] = useState('all');
  const [catalogImportForm, setCatalogImportForm] = useState({
    file: null as File | null,
    source_label: 'product_catalog_realtime_master',
    sheet_name: 'catalog_master',
    assign_supplier_strategy: 'none' as 'none' | 'round_robin',
    sync_missing: false,
    only_active: true,
    dry_run: true,
  });
  const [catalogImportBusy, setCatalogImportBusy] = useState(false);
  const [catalogImportResult, setCatalogImportResult] = useState<CatalogImportSummary | null>(null);

  const [supplierCreateForm, setSupplierCreateForm] = useState(emptySupplierCreateForm);
  const [showSupplierCreateForm, setShowSupplierCreateForm] = useState(false);
  const [supplierCreateBusy, setSupplierCreateBusy] = useState(false);
  const [showSupplierCreatePassword, setShowSupplierCreatePassword] = useState(false);
  const [suppliersSearch, setSuppliersSearch] = useState('');

  const [supplyCreateForm, setSupplyCreateForm] = useState(emptySupplyCreateForm);
  const [showSupplyCreateForm, setShowSupplyCreateForm] = useState(false);
  const [supplyCreateBusy, setSupplyCreateBusy] = useState(false);
  const [adminSupplyStatusUpdatingId, setAdminSupplyStatusUpdatingId] = useState<string | null>(null);
  const [supplyOrdersSearch, setSupplyOrdersSearch] = useState('');
  const [supplyOrdersStatusFilter, setSupplyOrdersStatusFilter] = useState<'all' | SupplyOrder['status']>('all');
  const [selectedSupplyHistory, setSelectedSupplyHistory] = useState<SupplyOrder | null>(null);

  const [supplierProductForm, setSupplierProductForm] = useState(emptySupplierProductForm);
  const [editingSupplierProductId, setEditingSupplierProductId] = useState<string | null>(null);
  const [showSupplierProductForm, setShowSupplierProductForm] = useState(false);
  const [supplierProductBusy, setSupplierProductBusy] = useState(false);
  const [supplierProductsSearch, setSupplierProductsSearch] = useState('');
  const [supplierProductsCategoryFilter, setSupplierProductsCategoryFilter] = useState('All');
  const [supplierProductsStockFilter, setSupplierProductsStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [uiSettings, setUiSettings] = useState({
    orderAlerts: true,
    emailUpdates: true,
    compactCards: false,
  });
  const [shopSettingsForm, setShopSettingsForm] = useState({
    name: '',
    tagline: '',
    location: '',
    eta_minutes: 20,
    is_open: true,
  });
  const [shopSettingsBusy, setShopSettingsBusy] = useState(false);

  const catalogProducts = useMemo(() => {
    return products.map((product) => {
      const department = productCategoryLabel(product.category);
      const parsed = parseCategoryLevels(department);
      const collection = productSubcategoryLabel(product.subcategory, parsed.collection);
      return {
        product,
        department,
        collection,
      };
    });
  }, [products]);

  const categories = useMemo(() => {
    const unique = new Set(catalogProducts.map((item) => item.department));
    return ['All', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [catalogProducts]);

  const highlightedCategories = useMemo(() => categories.slice(1, 7), [categories]);
  const featuredDeals = useMemo(() => {
    const now = Date.now();
    const inWindow = (product: Product) => {
      if (!product.deal_enabled) return false;
      if (!(product.compare_at_price > product.price)) return false;
      const startTs = product.deal_starts_at ? new Date(product.deal_starts_at).getTime() : null;
      const endTs = product.deal_ends_at ? new Date(product.deal_ends_at).getTime() : null;
      if (startTs && !Number.isNaN(startTs) && now < startTs) return false;
      if (endTs && !Number.isNaN(endTs) && now > endTs) return false;
      return true;
    };
    const sortDeals = (a: Product, b: Product) => {
      const aPriority = Number(a.deal_priority || 0);
      const bPriority = Number(b.deal_priority || 0);
      if (bPriority !== aPriority) return bPriority - aPriority;
      const aPct = (a.compare_at_price - a.price) / a.compare_at_price;
      const bPct = (b.compare_at_price - b.price) / b.compare_at_price;
      return bPct - aPct;
    };
    const configuredDeals = products.filter(inWindow).sort(sortDeals);
    if (configuredDeals.length > 0) return configuredDeals.slice(0, 12);
    return [...products]
      .filter((product) => product.compare_at_price > product.price)
      .sort(sortDeals)
      .slice(0, 12);
  }, [products]);
  const popularPicks = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.featured_score - a.featured_score;
      })
      .slice(0, 12);
  }, [products]);
  const subcategoryOptions = useMemo(() => {
    if (category === 'All') return ['All'];
    const options = new Set(
      catalogProducts
        .filter((item) => item.department === category)
        .map((item) => item.collection),
    );
    return ['All', ...Array.from(options).sort((a, b) => a.localeCompare(b))];
  }, [catalogProducts, category]);

  const searchQuery = useMemo(() => search.trim().toLowerCase(), [search]);

  const searchFilteredCatalogProducts = useMemo(() => {
    if (searchQuery.length === 0) return catalogProducts;
    return catalogProducts.filter((item) => {
      const searchable = [
        item.product.name,
        item.product.description,
        item.product.short_description || '',
        productBrandLabel(item.product.brand, ''),
        item.department,
        item.collection,
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(searchQuery);
    });
  }, [catalogProducts, searchQuery]);

  const visibleDepartmentCards = useMemo(() => {
    return Array.from(new Set(searchFilteredCatalogProducts.map((item) => item.department)))
      .sort((a, b) => a.localeCompare(b));
  }, [searchFilteredCatalogProducts]);

  const visibleCollectionCards = useMemo(() => {
    if (category === 'All') return [] as string[];
    return Array.from(
      new Set(
        searchFilteredCatalogProducts
          .filter((item) => item.department === category)
          .map((item) => item.collection),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [searchFilteredCatalogProducts, category]);

  const filteredProducts = useMemo(() => {
    return searchFilteredCatalogProducts
      .filter((item) => {
        const matchDepartment = category === 'All' || item.department === category;
        const matchCollection = subcategory === 'All' || item.collection === subcategory;
        return matchDepartment && matchCollection;
      })
      .map((item) => item.product);
  }, [searchFilteredCatalogProducts, category, subcategory]);
  const totalStorefrontProductPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProducts.length / STOREFRONT_PRODUCTS_PER_PAGE));
  }, [filteredProducts.length]);
  const paginatedFilteredProducts = useMemo(() => {
    const startIndex = (storefrontProductsPage - 1) * STOREFRONT_PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + STOREFRONT_PRODUCTS_PER_PAGE);
  }, [filteredProducts, storefrontProductsPage]);
  const storefrontProductsRange = useMemo(() => {
    if (filteredProducts.length === 0) return { start: 0, end: 0 };
    const start = (storefrontProductsPage - 1) * STOREFRONT_PRODUCTS_PER_PAGE + 1;
    const end = Math.min(storefrontProductsPage * STOREFRONT_PRODUCTS_PER_PAGE, filteredProducts.length);
    return { start, end };
  }, [filteredProducts.length, storefrontProductsPage]);
  const storefrontPageNumbers = useMemo(() => {
    if (totalStorefrontProductPages <= 7) {
      return Array.from({ length: totalStorefrontProductPages }, (_, idx) => idx + 1);
    }

    const pages: number[] = [1];
    const windowStart = Math.max(2, storefrontProductsPage - 1);
    const windowEnd = Math.min(totalStorefrontProductPages - 1, storefrontProductsPage + 1);

    if (windowStart > 2) {
      pages.push(-1);
    }
    for (let page = windowStart; page <= windowEnd; page += 1) {
      pages.push(page);
    }
    if (windowEnd < totalStorefrontProductPages - 1) {
      pages.push(-2);
    }
    pages.push(totalStorefrontProductPages);
    return pages;
  }, [totalStorefrontProductPages, storefrontProductsPage]);

  const cartProducts = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
      .filter((x): x is { product: Product; qty: number } => Boolean(x.product));
  }, [cart, products]);

  const cartTotal = useMemo(() => {
    return cartProducts.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  }, [cartProducts]);

  const isAdmin = session?.role === 'admin';
  const isSupplier = session?.role === 'supplier';
  const isUser = Boolean(session?.token) && !isAdmin && !isSupplier;
  const showStorefrontContent = !session?.token || activePage === 'home';
  const sortedAdminProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (a.inventory !== b.inventory) return a.inventory - b.inventory;
      return a.name.localeCompare(b.name);
    });
  }, [products]);
  const lowStockProducts = useMemo(() => {
    return sortedAdminProducts.filter((p) => p.inventory <= LOW_STOCK_THRESHOLD);
  }, [sortedAdminProducts]);
  const lowStockCarouselProducts = useMemo(() => {
    return lowStockProducts.slice(0, LOW_STOCK_CAROUSEL_LIMIT);
  }, [lowStockProducts]);
  const outOfStockProducts = useMemo(() => {
    return sortedAdminProducts.filter((p) => p.inventory <= 0);
  }, [sortedAdminProducts]);
  const adminCategoryOptions = useMemo(() => {
    const existing = products
      .map((product) => productCategoryLabel(product.category, ''))
      .filter((category) => category.length > 0);
    return Array.from(new Set([...ECOMMERCE_DEFAULT_CATEGORIES, ...existing])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [products]);
  const pendingSupplyOrders = useMemo(() => {
    return adminSupplyOrders.filter((o) => o.status === 'pending').length;
  }, [adminSupplyOrders]);
  const pendingSupplyOrderCards = useMemo(() => {
    return adminSupplyOrders.filter((order) => order.status === 'pending').slice(0, 12);
  }, [adminSupplyOrders]);
  const filteredSuppliers = useMemo(() => {
    const q = suppliersSearch.trim().toLowerCase();
    const sorted = [...suppliers].sort((a, b) => a.full_name.localeCompare(b.full_name));
    if (!q) return sorted;
    return sorted.filter((supplier) =>
      supplier.full_name.toLowerCase().includes(q) ||
      supplier.email.toLowerCase().includes(q) ||
      supplier.phone.toLowerCase().includes(q) ||
      supplier.address.toLowerCase().includes(q),
    );
  }, [suppliers, suppliersSearch]);
  const filteredSupplyOrders = useMemo(() => {
    const q = supplyOrdersSearch.trim().toLowerCase();
    return adminSupplyOrders.filter((order) => {
      const matchesStatus = supplyOrdersStatusFilter === 'all' || order.status === supplyOrdersStatusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        order.supply_order_id.toLowerCase().includes(q) ||
        order.supplier_name.toLowerCase().includes(q) ||
        order.title.toLowerCase().includes(q) ||
        order.notes.toLowerCase().includes(q)
      );
    });
  }, [adminSupplyOrders, supplyOrdersSearch, supplyOrdersStatusFilter]);
  const filteredSupplierOwnProducts = useMemo(() => {
    const q = supplierProductsSearch.trim().toLowerCase();
    return supplierOwnProducts.filter((product) => {
      const categoryLabel = productCategoryLabel(product.category);
      const matchesSearch =
        q.length === 0 ||
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        categoryLabel.toLowerCase().includes(q);
      const matchesCategory =
        supplierProductsCategoryFilter === 'All' || categoryLabel === supplierProductsCategoryFilter;
      const matchesStock =
        supplierProductsStockFilter === 'all' ||
        (supplierProductsStockFilter === 'out_of_stock' && product.inventory <= 0) ||
        (supplierProductsStockFilter === 'low_stock' && product.inventory > 0 && product.inventory <= LOW_STOCK_THRESHOLD) ||
        (supplierProductsStockFilter === 'in_stock' && product.inventory > LOW_STOCK_THRESHOLD);
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [supplierOwnProducts, supplierProductsSearch, supplierProductsCategoryFilter, supplierProductsStockFilter]);
  const supplierCategoryOptions = useMemo(() => {
    const existing = supplierOwnProducts
      .map((product) => productCategoryLabel(product.category, ''))
      .filter((category) => category.length > 0);
    return Array.from(new Set(existing)).sort((a, b) => a.localeCompare(b));
  }, [supplierOwnProducts]);
  const supplierLowStockProducts = useMemo(() => {
    return [...supplierOwnProducts]
      .filter((product) => product.inventory <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.inventory - b.inventory || a.name.localeCompare(b.name));
  }, [supplierOwnProducts]);
  const supplierLowStockCarouselProducts = useMemo(() => {
    return supplierLowStockProducts.slice(0, LOW_STOCK_CAROUSEL_LIMIT);
  }, [supplierLowStockProducts]);
  const deferredAdminProductsSearch = useDeferredValue(adminProductsSearch);
  const sortedAdminProductsIndex = useMemo(() => {
    return sortedAdminProducts.map((product) => ({
      product,
      searchable: `${product.name} ${product.description} ${productCategoryLabel(product.category)} ${productSubcategoryLabel(product.subcategory, '')} ${productBrandLabel(product.brand, '')}`.toLowerCase(),
    }));
  }, [sortedAdminProducts]);
  const filteredAdminProducts = useMemo(() => {
    const q = deferredAdminProductsSearch.trim().toLowerCase();
    return sortedAdminProductsIndex
      .filter(({ product, searchable }) => {
      const categoryLabel = productCategoryLabel(product.category);
      const matchesSearch =
          q.length === 0 || searchable.includes(q);
      const matchesCategory =
        adminProductsCategoryFilter === 'All' || categoryLabel === adminProductsCategoryFilter;
      const matchesStock =
        adminProductsStockFilter === 'all' ||
        (adminProductsStockFilter === 'out_of_stock' && product.inventory <= 0) ||
        (adminProductsStockFilter === 'low_stock' && product.inventory > 0 && product.inventory <= LOW_STOCK_THRESHOLD) ||
        (adminProductsStockFilter === 'in_stock' && product.inventory > LOW_STOCK_THRESHOLD);
      return matchesSearch && matchesCategory && matchesStock;
      })
      .map(({ product }) => product);
  }, [
    sortedAdminProductsIndex,
    deferredAdminProductsSearch,
    adminProductsCategoryFilter,
    adminProductsStockFilter,
  ]);
  const totalAdminProductPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAdminProducts.length / ADMIN_PRODUCTS_PER_PAGE));
  }, [filteredAdminProducts.length]);
  const paginatedAdminProducts = useMemo(() => {
    const startIndex = (adminProductsPage - 1) * ADMIN_PRODUCTS_PER_PAGE;
    return filteredAdminProducts.slice(startIndex, startIndex + ADMIN_PRODUCTS_PER_PAGE);
  }, [filteredAdminProducts, adminProductsPage]);
  const adminProductsRange = useMemo(() => {
    if (filteredAdminProducts.length === 0) return { start: 0, end: 0 };
    const start = (adminProductsPage - 1) * ADMIN_PRODUCTS_PER_PAGE + 1;
    const end = Math.min(adminProductsPage * ADMIN_PRODUCTS_PER_PAGE, filteredAdminProducts.length);
    return { start, end };
  }, [filteredAdminProducts.length, adminProductsPage]);
  const adminProductsPageNumbers = useMemo(() => {
    if (totalAdminProductPages <= 7) {
      return Array.from({ length: totalAdminProductPages }, (_, idx) => idx + 1);
    }
    const pages: number[] = [1];
    const windowStart = Math.max(2, adminProductsPage - 1);
    const windowEnd = Math.min(totalAdminProductPages - 1, adminProductsPage + 1);
    if (windowStart > 2) {
      pages.push(-1);
    }
    for (let page = windowStart; page <= windowEnd; page += 1) {
      pages.push(page);
    }
    if (windowEnd < totalAdminProductPages - 1) {
      pages.push(-2);
    }
    pages.push(totalAdminProductPages);
    return pages;
  }, [totalAdminProductPages, adminProductsPage]);
  const isAdminProductsSearching = adminProductsSearch !== deferredAdminProductsSearch;
  const productsWithValidNamesCount = useMemo(() => {
    return products.filter((product) => productDisplayName(product.name, '').length > 0).length;
  }, [products]);
  const adminProductsHeading = adminProductsCategoryFilter === 'All'
    ? 'All Products'
    : `${productCategoryLabel(adminProductsCategoryFilter)} Products`;
  const productsSectionRef = useRef<HTMLElement | null>(null);
  const suppliersPanelRef = useRef<HTMLDivElement | null>(null);
  const adminLowStockCarouselRef = useRef<HTMLDivElement | null>(null);
  const supplierLowStockCarouselRef = useRef<HTMLDivElement | null>(null);
  const supplyOrderCarouselRef = useRef<HTMLDivElement | null>(null);
  const runningAdminOrders = useMemo(() => {
    return adminOrders.filter((order) => {
      const s = order.status.toLowerCase();
      return s !== 'delivered' && s !== 'cancelled';
    });
  }, [adminOrders]);
  const recent24HourAdminOrdersCount = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return adminOrders.filter((order) => {
      const ts = new Date(order.created_at).getTime();
      return !Number.isNaN(ts) && ts >= since;
    }).length;
  }, [adminOrders]);
  const deliveredAdminOrders = useMemo(() => {
    return adminOrders.filter((order) => order.status.toLowerCase() === 'delivered').length;
  }, [adminOrders]);
  const runningUserOrders = useMemo(() => {
    return history.filter((order) => {
      const s = order.status.toLowerCase();
      return s !== 'delivered' && s !== 'cancelled';
    });
  }, [history]);
  const recent24HourUserOrdersCount = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return history.filter((order) => {
      const ts = new Date(order.created_at).getTime();
      return !Number.isNaN(ts) && ts >= since;
    }).length;
  }, [history]);
  const deliveredUserOrders = useMemo(() => {
    return history.filter((order) => order.status.toLowerCase() === 'delivered').length;
  }, [history]);
  const adminOrderStatusOptions = useMemo(() => {
    return Array.from(new Set([...ORDER_STATUSES, 'delivered', ...adminOrders.map((order) => order.status.toLowerCase())]));
  }, [adminOrders]);
  const filteredAdminOrders = useMemo(() => {
    const q = adminOrdersSearch.trim().toLowerCase();
    return adminOrders.filter((order) => {
      const normalizedStatus = order.status.toLowerCase();
      const matchesStatus =
        adminOrdersStatusFilter === 'all' ||
        (adminOrdersStatusFilter === 'running' && normalizedStatus !== 'delivered' && normalizedStatus !== 'cancelled') ||
        normalizedStatus === adminOrdersStatusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        order.order_id.toLowerCase().includes(q) ||
        normalizedStatus.includes(q) ||
        order.items.join(' ').toLowerCase().includes(q)
      );
    });
  }, [adminOrders, adminOrdersSearch, adminOrdersStatusFilter]);
  const recentSupplierDrawerOrders = useMemo(() => {
    const since = Date.now() - 12 * 60 * 60 * 1000;
    return supplierOrders.filter((order) => {
      const ts = new Date(order.updated_at || order.created_at).getTime();
      return !Number.isNaN(ts) && ts >= since;
    });
  }, [supplierOrders]);
  const recentAdminDrawerOrders = useMemo(() => {
    const since = Date.now() - 12 * 60 * 60 * 1000;
    return adminOrders.filter((order) => {
      const ts = new Date(order.created_at).getTime();
      return !Number.isNaN(ts) && ts >= since;
    });
  }, [adminOrders]);
  const recentAdminDrawerSupplyRequests = useMemo(() => {
    const since = Date.now() - 12 * 60 * 60 * 1000;
    return adminSupplyOrders.filter((order) => {
      const ts = new Date(order.updated_at || order.created_at).getTime();
      return !Number.isNaN(ts) && ts >= since;
    });
  }, [adminSupplyOrders]);
  const recentSupplierOrderRequests = useMemo(() => {
    const since = Date.now() - 12 * 60 * 60 * 1000;
    return history.filter((order) => {
      const ts = new Date(order.created_at).getTime();
      return !Number.isNaN(ts) && ts >= since;
    });
  }, [history]);
  const recentUserDrawerOrders = useMemo(() => {
    const since = Date.now() - 12 * 60 * 60 * 1000;
    return history.filter((order) => {
      const ts = new Date(order.created_at).getTime();
      return !Number.isNaN(ts) && ts >= since;
    });
  }, [history]);
  useEffect(() => {
    void bootstrap();
    const savedSession = localStorage.getItem(STORAGE_SESSION);
    const savedCart = localStorage.getItem(STORAGE_CART);
    const savedSettings = localStorage.getItem(STORAGE_UI_SETTINGS);
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession) as Session);
      } catch {
        localStorage.removeItem(STORAGE_SESSION);
      }
    }
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart) as Cart);
      } catch {
        localStorage.removeItem(STORAGE_CART);
      }
    }
    if (savedSettings) {
      try {
        setUiSettings((prev) => ({ ...prev, ...(JSON.parse(savedSettings) as Partial<typeof prev>) }));
      } catch {
        localStorage.removeItem(STORAGE_UI_SETTINGS);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!session?.token) return;
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    localStorage.setItem(STORAGE_UI_SETTINGS, JSON.stringify(uiSettings));
  }, [uiSettings]);

  useEffect(() => {
    if (!session?.token) return;
    void loadRoleData(session);

    const timer = window.setInterval(() => {
      void loadRealtime(session);
    }, 12000);

    return () => window.clearInterval(timer);
  }, [session?.token, session?.role]);

  useEffect(() => {
    if (!isSupplier || supplierOrders.length === 0) return;
    setSupplierExpectedDeliveryDrafts((prev) => {
      const next = { ...prev };
      supplierOrders.forEach((order) => {
        if (order.status !== 'pending') return;
        if (!next[order.supply_order_id]) {
          next[order.supply_order_id] = defaultExpectedDeliveryLocal();
        }
      });
      return next;
    });
  }, [isSupplier, supplierOrders]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!profileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [profileOpen]);

  useEffect(() => {
    if (!shop) return;
    setShopSettingsForm({
      name: shop.name || '',
      tagline: shop.tagline || '',
      location: shop.location || '',
      eta_minutes: shop.eta_minutes || 20,
      is_open: Boolean(shop.is_open),
    });
  }, [shop]);

  useEffect(() => {
    setAdminProductsPage(1);
  }, [adminProductsSearch, adminProductsCategoryFilter, adminProductsStockFilter, products.length]);

  useEffect(() => {
    setAdminProductsPage((prev) => Math.min(prev, totalAdminProductPages));
  }, [totalAdminProductPages]);

  useEffect(() => {
    if (subcategoryOptions.includes(subcategory)) return;
    setSubcategory('All');
  }, [subcategoryOptions, subcategory]);

  useEffect(() => {
    setStorefrontProductsPage(1);
  }, [searchQuery, category, subcategory]);

  useEffect(() => {
    setStorefrontProductsPage((prev) => Math.min(prev, totalStorefrontProductPages));
  }, [totalStorefrontProductPages]);

  useEffect(() => {
    if (activePage !== 'home') return;
    if (category === 'All') {
      setStorefrontScreen('departments');
      return;
    }
    if (subcategory === 'All') {
      setStorefrontScreen('collections');
      return;
    }
    setStorefrontScreen('products');
  }, [activePage, category, subcategory]);

  async function bootstrap() {
    setLoading(true);
    setError('');
    try {
      const [shopData, productsData] = await Promise.all([api.getShop(), api.getProducts()]);
      setShop(shopData);
      setProducts(productsData);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadRealtime(active: Session) {
    try {
      const [publicProducts, notification] = await Promise.all([
        api.getProducts(),
        api.getUnreadNotifications(active.token),
      ]);
      setProducts(publicProducts);
      setNotice(notification);

      if (active.role === 'admin') {
        const [orders, supply] = await Promise.all([
          api.getAdminOrders(active.token),
          api.getAdminSupplyOrders(active.token),
        ]);
        setAdminOrders(orders);
        setAdminSupplyOrders(supply);
      }

      if (active.role === 'supplier') {
        const [supply, ownProducts, orderHistory] = await Promise.all([
          api.getSupplierSupplyOrders(active.token),
          api.getSupplierProducts(active.token),
          api.getOrderHistory(active.token).catch(() => [] as OrderHistoryItem[]),
        ]);
        setSupplierOrders(supply);
        setSupplierOwnProducts(ownProducts);
        setHistory(orderHistory);
      }

      if (active.role === 'user') {
        const orders = await api.getOrderHistory(active.token);
        setHistory(orders);
      }
    } catch {
      // Silent realtime retries.
    }
  }

  async function loadRoleData(active: Session) {
    try {
      const noticeData = await api.getUnreadNotifications(active.token);
      setNotice(noticeData);
    } catch {
      setNotice({ unread_count: 0, items: [] });
    }

    if (active.role === 'user') {
      try {
        const userHistory = await api.getOrderHistory(active.token);
        setHistory(userHistory);
      } catch {
        setHistory([]);
      }
      return;
    }

    if (active.role === 'admin') {
      try {
        const [orders, supply, supplierList] = await Promise.all([
          api.getAdminOrders(active.token),
          api.getAdminSupplyOrders(active.token),
          api.getSuppliers(active.token),
        ]);
        setAdminOrders(orders);
        setAdminSupplyOrders(supply);
        setSuppliers(supplierList);
        if (supplierList[0]) {
          setSelectedSupplierId((prev) => prev || supplierList[0].user_id);
        }
      } catch (e) {
        setToast(getApiError(e));
      }
      return;
    }

    if (active.role === 'supplier') {
      try {
        const [supply, ownProducts, orderHistory] = await Promise.all([
          api.getSupplierSupplyOrders(active.token),
          api.getSupplierProducts(active.token),
          api.getOrderHistory(active.token).catch(() => [] as OrderHistoryItem[]),
        ]);
        setSupplierOrders(supply);
        setSupplierOwnProducts(ownProducts);
        setHistory(orderHistory);
      } catch (e) {
        setToast(getApiError(e));
      }
    }
  }

  useEffect(() => {
    async function loadProductsBySupplier() {
      if (!session?.token || !isAdmin || !selectedSupplierId) {
        setSupplierProducts([]);
        return;
      }
      try {
        const list = await api.getAdminSupplierProducts(session.token, selectedSupplierId);
        setSupplierProducts(list);
        if (list[0]) {
          setSupplyCreateForm((prev) => ({ ...prev, product_id: list[0].id }));
        }
      } catch {
        setSupplierProducts([]);
      }
    }
    void loadProductsBySupplier();
  }, [session?.token, isAdmin, selectedSupplierId]);

  function logout() {
    setSession(null);
    setHistory([]);
    setAdminOrders([]);
    setAdminSupplyOrders([]);
    setSupplierOrders([]);
    setSupplierOwnProducts([]);
    setNotice({ unread_count: 0, items: [] });
    setSelectedOrder(null);
    setProfileOpen(false);
    setSettingsOpen(false);
    setLogoutConfirmOpen(false);
    setActivePage('home');
    localStorage.removeItem(STORAGE_SESSION);
    setToast('Logged out');
  }

  function setPage(page: AppPage) {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function chooseDepartment(nextDepartment: string) {
    setCategory(nextDepartment);
    setSubcategory('All');
    setStorefrontScreen(nextDepartment === 'All' ? 'departments' : 'collections');
  }

  function chooseCollection(nextCollection: string) {
    setSubcategory(nextCollection);
    setStorefrontScreen(nextCollection === 'All' ? 'collections' : 'products');
  }

  function resetCatalogNavigation() {
    setCategory('All');
    setSubcategory('All');
    setStorefrontScreen('departments');
  }

  function addToCart(product: Product) {
    if (product.inventory <= 0) return;
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }));
    setToast(`${productDisplayName(product.name)} added to cart`);
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) => {
      const next = { ...prev };
      const value = (next[productId] || 0) + delta;
      if (value <= 0) delete next[productId];
      else next[productId] = value;
      return next;
    });
  }

  async function handleLogin() {
    setAuthBusy(true);
    setAuthError('');
    const identifier = loginIdentifier.trim();
    const password = loginPassword;
    if (!identifier) {
      setAuthError('Enter email or phone number.');
      setAuthBusy(false);
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      setAuthBusy(false);
      return;
    }
    try {
      const result = await api.login(identifier, password);
      setSession(result);
      setActivePage(result.role === 'supplier' ? 'supplier-products' : 'home');
      setAuthOpen(false);
      setLoginIdentifier('');
      setLoginPassword('');
      setToast(`Welcome, ${result.full_name || result.role}`);
    } catch (e) {
      setAuthError(getApiError(e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function ensureGoogleIdentityScriptLoaded() {
    const win = window as Window & {
      google?: {
        accounts?: {
          id?: {
            initialize: (options: Record<string, unknown>) => void;
            renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          };
        };
      };
      __googleIdentityScriptPromise?: Promise<void>;
    };

    if (win.google?.accounts?.id) return;
    if (win.__googleIdentityScriptPromise) {
      await win.__googleIdentityScriptPromise;
      return;
    }

    win.__googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Sign-In SDK.'));
      document.head.appendChild(script);
    });

    await win.__googleIdentityScriptPromise;
  }

  useEffect(() => {
    if (!authOpen || authMode !== 'login') return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
    if (!clientId) return;

    let cancelled = false;

    async function setupGoogleButton() {
      try {
        await ensureGoogleIdentityScriptLoaded();
        if (cancelled) return;

        const win = window as Window & {
          google?: {
            accounts?: {
              id?: {
                initialize: (options: Record<string, unknown>) => void;
                renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
              };
            };
          };
        };

        const googleId = win.google?.accounts?.id;
        const mount = googleSignInMountRef.current;
        if (!googleId || !mount) return;

        googleId.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            const credential = response.credential?.trim();
            if (!credential) {
              setAuthError('Google credential is missing. Please try again.');
              return;
            }
            setGoogleAuthBusy(true);
            setAuthError('');
            try {
              const result = await api.continueWithGoogle(credential);
              setSession(result);
              setActivePage(result.role === 'supplier' ? 'supplier-products' : 'home');
              setAuthOpen(false);
              setLoginIdentifier('');
              setLoginPassword('');
              setToast(`Welcome, ${result.full_name || result.role}`);
            } catch (e) {
              setAuthError(getApiError(e));
            } finally {
              setGoogleAuthBusy(false);
            }
          },
          auto_select: false,
          use_fedcm_for_prompt: true,
        });

        mount.innerHTML = '';
        googleId.renderButton(mount, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 320,
        });
      } catch (e) {
        setAuthError(getApiError(e));
      }
    }

    void setupGoogleButton();
    return () => {
      cancelled = true;
    };
  }, [authOpen, authMode]);

  async function handleRegister() {
    setAuthBusy(true);
    setAuthError('');
    const username = regForm.username.trim();
    const email = regForm.email.trim().toLowerCase();
    const countryCode = regForm.country_code.trim();
    const phone = regForm.phone.trim();
    const password = regForm.password;
    const confirmPassword = regConfirmPassword;
    if (!EMAIL_REGEX.test(email)) {
      setAuthError('Enter a valid email address.');
      setAuthBusy(false);
      return;
    }
    if (username.length < 2) {
      setAuthError('Username must be at least 2 characters.');
      setAuthBusy(false);
      return;
    }
    if (!COUNTRY_CODE_REGEX.test(countryCode)) {
      setAuthError('Country code must look like +91.');
      setAuthBusy(false);
      return;
    }
    if (!PHONE_REGEX.test(phone)) {
      setAuthError('Enter a valid phone number.');
      setAuthBusy(false);
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      setAuthBusy(false);
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      setAuthBusy(false);
      return;
    }
    try {
      await api.registerUser({
        username,
        email,
        country_code: countryCode,
        phone,
        password,
      });
      setAuthMode('login');
      setRegForm({
        username: '',
        email: '',
        country_code: '+91',
        phone: '',
        password: '',
      });
      setRegConfirmPassword('');
      setToast('Registration complete. Please login.');
    } catch (e) {
      setAuthError(getApiError(e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleCheckout() {
    if (!session?.token) {
      setAuthOpen(true);
      setToast('Please login to checkout');
      return;
    }
    try {
      await api.checkout(session.token, cart);
      setCart({});
      const orders = await api.getOrderHistory(session.token);
      setHistory(orders);
      setCartOpen(false);
      setToast('Order placed successfully');
    } catch (e) {
      setToast(getApiError(e));
    }
  }

  async function openOrder(orderId: string) {
    if (!session?.token) return;
    try {
      const data = isAdmin
        ? await api.getAdminOrderDetail(session.token, orderId)
        : await api.getOrderDetail(session.token, orderId);
      setSelectedOrder(data);
    } catch (e) {
      setToast(getApiError(e));
    }
  }

  async function confirmDelivery(orderId: string) {
    if (!session?.token) return;
    try {
      await api.confirmDelivered(session.token, orderId);
      const orders = await api.getOrderHistory(session.token);
      setHistory(orders);
      setToast('Delivery confirmed');
      setSelectedOrder(null);
    } catch (e) {
      setToast(getApiError(e));
    }
  }

  async function updateAdminOrder(orderId: string, status: string) {
    if (!session?.token) return;
    setAdminOrderStatusUpdatingId(orderId);
    try {
      await api.updateAdminOrderStatus(session.token, orderId, status);
      const orders = await api.getAdminOrders(session.token);
      setAdminOrders(orders);
      setToast(`Order status updated to ${status}`);
    } catch (e) {
      setToast(getApiError(e));
    } finally {
      setAdminOrderStatusUpdatingId(null);
    }
  }

  async function saveShopSettingsFromPopup() {
    if (!session?.token || !isAdmin || !shop) return;
    if (!shopSettingsForm.name.trim() || !shopSettingsForm.location.trim()) {
      setToast('Shop name and location are required');
      return;
    }
    setShopSettingsBusy(true);
    try {
      const updated = await api.updateShop(session.token, {
        name: shopSettingsForm.name.trim(),
        tagline: shopSettingsForm.tagline.trim(),
        location: shopSettingsForm.location.trim(),
        eta_minutes: Number(shopSettingsForm.eta_minutes) || shop.eta_minutes,
        is_open: shopSettingsForm.is_open,
      });
      setShop(updated);
      setToast('Shop details updated');
    } catch (e) {
      setToast(getApiError(e));
    } finally {
      setShopSettingsBusy(false);
    }
  }

  async function handleCatalogImport() {
    if (!session?.token || !isAdmin) return;
    if (!catalogImportForm.file) {
      setToast('Choose an Excel file before importing');
      return;
    }
    setCatalogImportBusy(true);
    setCatalogImportResult(null);
    try {
      const result = await api.importAdminCatalogExcel(session.token, {
        file: catalogImportForm.file,
        source_label: catalogImportForm.source_label.trim() || undefined,
        sheet_name: catalogImportForm.sheet_name.trim() || undefined,
        assign_supplier_strategy: catalogImportForm.assign_supplier_strategy,
        sync_missing: catalogImportForm.sync_missing,
        only_active: catalogImportForm.only_active,
        dry_run: catalogImportForm.dry_run,
      });
      setCatalogImportResult(result);
      await bootstrap();
      await loadRoleData(session);
      setToast(
        result.dry_run
          ? `Dry run complete. Create: ${result.created}, Update: ${result.updated}, Skipped: ${result.skipped}`
          : `Catalog sync complete. Create: ${result.created}, Update: ${result.updated}`,
      );
    } catch (e) {
      setToast(getApiError(e));
    } finally {
      setCatalogImportBusy(false);
    }
  }

  function resetAdminProductEditor() {
    setAdminProductForm(emptyAdminProductForm());
    setEditingAdminProductId(null);
    setShowAdminProductForm(false);
  }

  function editAdminProduct(product: Product) {
    setEditingAdminProductId(product.id);
    setShowAdminProductForm(true);
    setAdminProductForm({
      name: product.name,
      description: product.description,
      short_description: product.short_description || '',
      category: product.category,
      subcategory: product.subcategory || '',
      brand: product.brand || '',
      slug: product.slug || '',
      currency: product.currency || 'INR',
      tax_percent: Number(product.tax_percent || 0),
      stock_status: product.stock_status || (product.inventory <= 0 ? 'out_of_stock' : product.inventory <= LOW_STOCK_THRESHOLD ? 'low_stock' : 'in_stock'),
      price: product.price,
      compare_at_price: product.compare_at_price,
      rating: product.rating,
      inventory: product.inventory,
      unit: product.unit,
      unit_value: product.unit_value,
      image: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openNewAdminProductForm() {
    setEditingAdminProductId(null);
    setAdminProductForm(emptyAdminProductForm());
    setShowAdminProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openNewSupplierProductForm() {
    setEditingSupplierProductId(null);
    setSupplierProductForm(emptySupplierProductForm());
    setShowSupplierProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollLowStockCarousel(direction: 'left' | 'right', target: 'admin' | 'supplier' = 'admin') {
    const carousel = target === 'supplier' ? supplierLowStockCarouselRef.current : adminLowStockCarouselRef.current;
    if (!carousel) return;
    const distance = Math.max(260, Math.floor(carousel.clientWidth * 0.65));
    carousel.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  }

  function openSupplierCreateModal() {
    setSupplierCreateForm(emptySupplierCreateForm());
    setShowSupplierCreateForm(true);
  }

  function openSupplyRequestModal() {
    if (!selectedSupplierId && suppliers[0]) {
      setSelectedSupplierId(suppliers[0].user_id);
    }
    setSupplyCreateForm(emptySupplyCreateForm());
    setShowSupplyCreateForm(true);
  }

  function scrollSupplyOrderCarousel(direction: 'left' | 'right') {
    if (!supplyOrderCarouselRef.current) return;
    const distance = Math.max(260, Math.floor(supplyOrderCarouselRef.current.clientWidth * 0.65));
    supplyOrderCarouselRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  }

  async function saveAdminProduct() {
    if (!session?.token) return;
    if (!adminProductForm.name.trim() || !adminProductForm.description.trim() || !adminProductForm.category.trim()) {
      setToast('Please fill name, description, and category');
      return;
    }
    const payload = {
      ...adminProductForm,
      name: adminProductForm.name.trim(),
      description: adminProductForm.description.trim(),
      short_description: adminProductForm.short_description.trim(),
      category: adminProductForm.category.trim(),
      subcategory: adminProductForm.subcategory.trim(),
      brand: adminProductForm.brand.trim(),
      slug: adminProductForm.slug.trim(),
      currency: adminProductForm.currency.trim().toUpperCase() || 'INR',
      tax_percent: Number.isFinite(adminProductForm.tax_percent) ? adminProductForm.tax_percent : 0,
      price: Number.isFinite(adminProductForm.price) ? adminProductForm.price : 0,
      compare_at_price: Number.isFinite(adminProductForm.compare_at_price) ? adminProductForm.compare_at_price : 0,
      rating: Number.isFinite(adminProductForm.rating) ? adminProductForm.rating : 0,
      inventory: Number.isFinite(adminProductForm.inventory) ? adminProductForm.inventory : 0,
      unit_value: Number.isFinite(adminProductForm.unit_value) ? adminProductForm.unit_value : 1,
    };
    setAdminProductBusy(true);
    try {
      if (editingAdminProductId) {
        await api.updateAdminProduct(session.token, editingAdminProductId, payload);
        setToast('Product updated');
      } else {
        await api.createAdminProduct(session.token, payload);
        setToast('Product created');
      }
      const list = await api.getProducts();
      setProducts(list);
      resetAdminProductEditor();
    } catch (e) {
      setToast(getApiError(e));
    } finally {
      setAdminProductBusy(false);
    }
  }

  async function deleteAdminProduct(productId: string) {
    if (!session?.token) return;
    setConfirmDeleteProduct(null);
    setAdminProductDeletingId(productId);
    try {
      await api.deleteAdminProduct(session.token, productId);
      const list = await api.getProducts();
      setProducts(list);
      if (editingAdminProductId === productId) {
        resetAdminProductEditor();
      }
      setToast('Product deleted');
    } catch (e) {
      setToast(getApiError(e));
    } finally {
      setAdminProductDeletingId(null);
    }
  }

  function askDeleteAdminProduct(productId: string) {
    const product = products.find((item) => item.id === productId) || null;
    if (!product) {
      void deleteAdminProduct(productId);
      return;
    }
    setConfirmDeleteProduct(product);
  }

  async function createSupplierAccount() {
    if (!session?.token) return;
    const username = supplierCreateForm.username.trim();
    const email = supplierCreateForm.email.trim().toLowerCase();
    const countryCode = supplierCreateForm.country_code.trim();
    const phone = supplierCreateForm.phone.trim();
    const address = supplierCreateForm.address.trim();
    const password = supplierCreateForm.password;
    if (username.length < 2) {
      setToast('Supplier name must be at least 2 characters');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setToast('Enter a valid supplier email address');
      return;
    }
    if (!COUNTRY_CODE_REGEX.test(countryCode)) {
      setToast('Country code must look like +91');
      return;
    }
    if (!PHONE_REGEX.test(phone)) {
      setToast('Enter a valid supplier phone number');
      return;
    }
    if (address.length < 3) {
      setToast('Supplier address is too short');
      return;
    }
    if (password.length < 8) {
      setToast('Supplier password must be at least 8 characters');
      return;
    }
    setSupplierCreateBusy(true);
    try {
      await api.createSupplier(session.token, {
        username,
        email,
        country_code: countryCode,
        phone,
        address,
        password,
      });
      const list = await api.getSuppliers(session.token);
      setSuppliers(list);
      setSupplierCreateForm(emptySupplierCreateForm());
      setShowSupplierCreateForm(false);
      setToast('Supplier account created');
    } catch (e) {
      setToast(getApiError(e));
    } finally {
      setSupplierCreateBusy(false);
    }
  }

  async function createSupplyOrderByAdmin() {
    if (!session?.token || !selectedSupplierId || !supplyCreateForm.product_id) {
      setToast('Please select supplier and product');
      return;
    }
    if (Number(supplyCreateForm.unit_value) <= 0) {
      setToast('Requested quantity should be greater than 0');
      return;
    }
    setSupplyCreateBusy(true);
    try {
      await api.createSupplyOrder(session.token, {
        supplier_user_id: selectedSupplierId,
        notes: supplyCreateForm.notes,
        items: [
          {
            product_id: supplyCreateForm.product_id,
            unit_value: Number(supplyCreateForm.unit_value),
          },
        ],
      });
      const orders = await api.getAdminSupplyOrders(session.token);
      setAdminSupplyOrders(orders);
      setSupplyCreateForm(emptySupplyCreateForm());
      setShowSupplyCreateForm(false);
      setToast('Supply request sent');
    } catch (e) {
      setToast(getApiError(e));
    } finally {
      setSupplyCreateBusy(false);
    }
  }

  async function updateAdminSupplyStatus(orderId: string, status: string) {
    if (!session?.token) return;
    const current = adminSupplyOrders.find((order) => order.supply_order_id === orderId);
    if (!current) return;
    const nextStatus = status as SupplyOrder['status'];
    if (nextStatus === current.status) return;
    const allowed = allowedAdminSupplyTransitions(current.status);
    if (nextStatus !== current.status && !allowed.includes(nextStatus)) {
      setToast(`Status change from ${current.status} to ${nextStatus} is not allowed`);
      return;
    }
    setAdminSupplyStatusUpdatingId(orderId);
    try {
      await api.updateAdminSupplyOrderStatus(session.token, orderId, { status: nextStatus });
      const orders = await api.getAdminSupplyOrders(session.token);
      setAdminSupplyOrders(orders);
      setToast('Supply order updated');
    } catch (e) {
      setToast(getApiError(e));
    } finally {
      setAdminSupplyStatusUpdatingId(null);
    }
  }

  async function createSupplierProductAction() {
    if (!session?.token) return;
    if (!supplierProductForm.name.trim() || !supplierProductForm.description.trim() || !supplierProductForm.category.trim()) {
      setToast('Please fill product name, description, and category');
      return;
    }
    setSupplierProductBusy(true);
    try {
      if (editingSupplierProductId) {
        await api.updateSupplierProduct(session.token, editingSupplierProductId, supplierProductForm);
      } else {
        await api.createSupplierProduct(session.token, supplierProductForm);
      }
      const list = await api.getSupplierProducts(session.token);
      setSupplierOwnProducts(list);
      setSupplierProductForm(emptySupplierProductForm());
      setEditingSupplierProductId(null);
      setShowSupplierProductForm(false);
      setToast(editingSupplierProductId ? 'Supplier product updated' : 'Supplier product created');
    } catch (e) {
      setToast(getApiError(e));
    } finally {
      setSupplierProductBusy(false);
    }
  }

  async function deleteSupplierProductAction(id: string) {
    if (!session?.token) return;
    try {
      await api.deleteSupplierProduct(session.token, id);
      const list = await api.getSupplierProducts(session.token);
      setSupplierOwnProducts(list);
      if (editingSupplierProductId === id) {
        resetSupplierProductEditor();
      }
      setToast('Supplier product deleted');
    } catch (e) {
      setToast(getApiError(e));
    }
  }

  function editSupplierProduct(product: Product) {
    setEditingSupplierProductId(product.id);
    setShowSupplierProductForm(true);
    setSupplierProductForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      inventory: product.inventory,
      unit: product.unit,
      unit_value: product.unit_value,
      image: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetSupplierProductEditor() {
    setEditingSupplierProductId(null);
    setSupplierProductForm(emptySupplierProductForm());
    setShowSupplierProductForm(false);
  }

  async function updateSupplierSupplyStatus(
    orderId: string,
    status: 'accepted' | 'rejected',
    expectedDate?: string,
  ) {
    if (!session?.token) return;
    const current = supplierOrders.find((order) => order.supply_order_id === orderId);
    if (!current) return;
    const allowed = allowedSupplierSupplyTransitions(current.status);
    if (!allowed.includes(status)) {
      setToast(`Status change from ${current.status} to ${status} is not allowed`);
      return;
    }
    try {
      await api.updateSupplierSupplyOrderStatus(session.token, orderId, {
        status,
        notes: status === 'accepted' ? 'Supplier accepted request' : 'Supplier rejected request',
        expected_delivery_at: expectedDate,
      });
      const orders = await api.getSupplierSupplyOrders(session.token);
      setSupplierOrders(orders);
      setSupplierExpectedDeliveryDrafts((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setToast('Response sent to admin');
    } catch (e) {
      setToast(getApiError(e));
    }
  }

  async function markNoticesRead() {
    if (!session?.token) return;
    try {
      await api.markNotificationsRead(session.token);
      setNotice({ unread_count: 0, items: [] });
      setNotificationsError('');
    } catch (e) {
      setToast(getApiError(e));
    }
  }

  async function openNotificationsDialog() {
    if (!session?.token) {
      setAuthOpen(true);
      setToast('Please sign in to view notifications.');
      return;
    }
    setNotificationsOpen(true);
    setNotificationsLoading(true);
    setNotificationsError('');
    try {
      const data = await api.getUnreadNotifications(session.token);
      setNotice(data);
    } catch (e) {
      setNotificationsError(getApiError(e));
    } finally {
      setNotificationsLoading(false);
    }
  }

  return (
    <div className="site-root">
      <div className="aurora" />
      <motion.header
        className="top-nav"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="brand-block">
          <img src={brandLogo} alt="Urban Cart logo" className="brand-logo" />
          <div className="header-shop-details">
            <h1>{shop?.name || 'Shop Details'}</h1>
            <p className="muted">{shop?.location || 'Location unavailable'}</p>
            {/* {shop ? (
              <div className="hero-meta header-shop-meta">
                <span className="pill">Rating {shop.rating}</span>
                <span className="pill">ETA {shop.eta_minutes} mins</span>
                <span className={`pill ${shop.is_open ? 'open' : 'closed'}`}>
                  {shop.is_open ? 'Open' : 'Closed'}
                </span>
              </div>
            ) : null} */}
          </div>
        </div>
        <div className="top-actions">
          <button
            className="icon-btn"
            aria-label="Profile"
            title="Profile"
            onClick={() => {
              setAuthOpen(false);
              setProfileOpen((prev) => !prev);
            }}
          >
            <AppIcon name="user" className="icon-glyph" />
          </button>
          {isAdmin ? (
            <button
              className="icon-btn"
              aria-label="Settings"
              title="Settings"
              onClick={() => {
                setSettingsTab('preferences');
                setSettingsOpen(true);
              }}
            >
              <AppIcon name="settings" className="icon-glyph" />
              <span className="action-label">Settings</span>
            </button>
          ) : null}
          {session?.token ? (
            <button
              className="icon-btn"
              aria-label="Notifications"
              title={`Notifications${notice.unread_count > 0 ? ` (${notice.unread_count})` : ''}`}
              onClick={() => void openNotificationsDialog()}
            >
              <AppIcon name="bell" className="icon-glyph" />
              {notice.unread_count > 0 ? <b className="icon-badge">{notice.unread_count > 99 ? '99+' : notice.unread_count}</b> : null}
            </button>
          ) : null}
          <button className="icon-btn cart-btn" aria-label="Cart" title="Cart" onClick={() => setCartOpen(true)}>
            <AppIcon name="cart" className="icon-glyph" />
            <span className="action-label">Cart</span>
            {cartProducts.length > 0 ? <b className="icon-badge">{cartProducts.length}</b> : null}
          </button>
          {session?.token ? (
            <button className="icon-btn" aria-label="Logout" title="Logout" onClick={() => setLogoutConfirmOpen(true)}>
              <AppIcon name="logout" className="icon-glyph" />
              <span className="action-label">Logout</span>
            </button>
          ) : (
            <button className="icon-btn" aria-label="Login / Signup" title="Login / Signup" onClick={() => setAuthOpen(true)}>
              <AppIcon name="login" className="icon-glyph" />
              <span className="action-label">Login / Signup</span>
            </button>
          )}
        </div>
      </motion.header>


      {showStorefrontContent ? (
        <>
          <motion.section
            className="promo-strip"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <article className="promo-card promo-card-sale">
              <p className="label">Mega Deal</p>
              <h3>Up to 45% off on essentials</h3>
              <p className="muted">Fresh picks delivered in under 30 minutes</p>
            </article>
            <article className="promo-card promo-card-fresh">
              <p className="label">Farm Direct</p>
              <h3>Daily-stocked vegetables and fruits</h3>
              <p className="muted">Sourced from partner farms every morning</p>
            </article>
            <article className="promo-card promo-card-delivery">
              <p className="label">Express</p>
              <h3>Free delivery above ₹499</h3>
              <p className="muted">Live order tracking from checkout to doorstep</p>
            </article>
          </motion.section>

          {isAdmin && activePage === 'home' && runningAdminOrders.length > 0 ? (
            <motion.section
              className="panel home-live-orders"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
            >
              <div className="products-head-row">
                <div>
                  <h3>Live Orders</h3>
                  <p className="muted">Realtime order tracking for admin home dashboard.</p>
                </div>
                <div className="products-head-stats">
                  <article className="products-stat">
                    <span>Running</span>
                    <strong>{runningAdminOrders.length}</strong>
                  </article>
                  <article className="products-stat">
                    <span>Past 24h</span>
                    <strong>{recent24HourAdminOrdersCount}</strong>
                  </article>
                  <article className="products-stat">
                    <span>Delivered</span>
                    <strong>{deliveredAdminOrders}</strong>
                  </article>
                </div>
              </div>
              <div className="admin-product-cards mini-top">
                {runningAdminOrders.slice(0, 6).map((order) => {
                  const allowedTransitions = allowedAdminOrderTransitions(order.status);
                  const selectableStatuses = [order.status, ...allowedTransitions];
                  const isLocked = allowedTransitions.length === 0;
                  const isUpdating = adminOrderStatusUpdatingId === order.order_id;
                  return (
                    <article
                      className="admin-product-card clickable-card"
                      key={`home-live-${order.order_id}`}
                      onClick={() => void openOrder(order.order_id)}
                    >
                      <div className="admin-product-card-head">
                        <strong>{displayName(order.customer_name, 'Customer Order')}</strong>
                        <div className="supply-card-top-actions">
                          <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
                          <button
                            type="button"
                            className="ghost history-icon-btn"
                            aria-label="Open order history"
                            title="History"
                            onClick={(e) => {
                              e.stopPropagation();
                              void openOrder(order.order_id);
                            }}
                          >
                            <AppIcon name="history" />
                          </button>
                        </div>
                      </div>
                      <p className="muted small">Placed {formatTime(order.created_at)}</p>
                      <p className="muted admin-product-sub">{order.items.join(', ')}</p>
                      <div className="row between">
                        <strong>{money(order.total_amount)}</strong>
                        <select
                          value={order.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => void updateAdminOrder(order.order_id, e.target.value)}
                          disabled={isLocked || isUpdating}
                        >
                          {selectableStatuses.map((status) => (
                            <option key={`home-live-${order.order_id}-${status}`} value={status}>{formatStatusText(status)}</option>
                          ))}
                        </select>
                      </div>
                    </article>
                  );
                })}
              </div>
            </motion.section>
          ) : null}

          {isUser && activePage === 'home' && runningUserOrders.length > 0 ? (
            <motion.section
              className="panel home-live-orders"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
            >
              <div className="products-head-row">
                <div>
                  <h3>Live Orders</h3>
                  <p className="muted">Realtime tracking for your active orders.</p>
                </div>
                <div className="products-head-stats">
                  <article className="products-stat">
                    <span>Running</span>
                    <strong>{runningUserOrders.length}</strong>
                  </article>
                  <article className="products-stat">
                    <span>Past 24h</span>
                    <strong>{recent24HourUserOrdersCount}</strong>
                  </article>
                  <article className="products-stat">
                    <span>Delivered</span>
                    <strong>{deliveredUserOrders}</strong>
                  </article>
                </div>
              </div>
              <div className="admin-product-cards mini-top">
                {runningUserOrders.slice(0, 6).map((order) => (
                  <article
                    className="admin-product-card clickable-card"
                    key={`user-home-live-${order.order_id}`}
                    onClick={() => void openOrder(order.order_id)}
                  >
                    <div className="admin-product-card-head">
                      <strong>{displayName(order.customer_name, session?.full_name || 'Customer')}</strong>
                      <div className="supply-card-top-actions">
                        <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
                        <button
                          type="button"
                          className="ghost history-icon-btn"
                          aria-label="Open order history"
                          title="History"
                          onClick={(e) => {
                            e.stopPropagation();
                            void openOrder(order.order_id);
                          }}
                        >
                          <AppIcon name="history" />
                        </button>
                      </div>
                    </div>
                    <p className="muted small">Placed {formatTime(order.created_at)}</p>
                    <p className="muted admin-product-sub">{order.items.join(', ')}</p>
                    <div className="row between">
                      <strong>{money(order.total_amount)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </motion.section>
          ) : null}

          {featuredDeals.length > 0 ? (
            <section className="panel mini-top">
              <div className="row between">
                <h3>Deals Of The Day</h3>
                <p className="muted small">{featuredDeals.length} active offers</p>
              </div>
              <div className="deal-strip mini-top">
                {featuredDeals.map((product) => {
                  const offerPercent = Math.max(1, Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100));
                  return (
                    <article key={`deal-${product.id}`} className="deal-card clickable-card" onClick={() => setSelectedProductDetail(product)}>
                      <div className="deal-image" style={{ background: productGradient(product) }}>
                        {product.image_url ? <img src={product.image_url} alt={productDisplayName(product.name)} /> : <span>{productCategoryLabel(product.category)}</span>}
                      </div>
                      <div className="stack">
                        <strong>{productDisplayName(product.name)}</strong>
                        <p className="muted small">{productBrandLabel(product.brand, productCategoryLabel(product.category))}</p>
                        <div className="row between">
                          <strong className="product-price">{money(product.price)}</strong>
                          <span className="status offer">{offerPercent}% OFF</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {popularPicks.length > 0 ? (
            <section className="panel mini-top">
              <div className="row between">
                <h3>Popular Picks</h3>
                <p className="muted small">Highest rated and featured products</p>
              </div>
              <div className="picks-grid mini-top">
                {popularPicks.slice(0, 6).map((product) => (
                  <article key={`pick-${product.id}`} className="pick-card clickable-card" onClick={() => setSelectedProductDetail(product)}>
                    <div className="pick-head">
                      <span className="status review-star">★ {product.rating.toFixed(1)}</span>
                      {product.stock_status ? <span className="muted small">{formatStatusText(product.stock_status)}</span> : null}
                    </div>
                    <h4>{productDisplayName(product.name)}</h4>
                    <p className="muted small">{product.short_description?.trim() || product.description}</p>
                    <div className="row between">
                      <strong>{money(product.price)}</strong>
                      <button
                        type="button"
                        className="ghost"
                        disabled={product.inventory <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="panel mini-top">
            <div className="row between">
              <div>
                <h3>Catalog Navigator</h3>
                <p className="muted">Browse like a real marketplace: departments, collections, then products.</p>
              </div>
              <div className="row">
                <button
                  type="button"
                  className={`ghost ${storefrontScreen === 'departments' ? 'chip-active' : ''}`}
                  onClick={() => setStorefrontScreen('departments')}
                >
                  Departments
                </button>
                <button
                  type="button"
                  className={`ghost ${storefrontScreen === 'collections' ? 'chip-active' : ''}`}
                  onClick={() => setStorefrontScreen('collections')}
                  disabled={category === 'All'}
                >
                  Collections
                </button>
                <button
                  type="button"
                  className={`ghost ${storefrontScreen === 'products' ? 'chip-active' : ''}`}
                  onClick={() => setStorefrontScreen('products')}
                >
                  Products
                </button>
              </div>
            </div>

            {highlightedCategories.length > 0 ? (
              <section className="chips-row mini-top">
                {highlightedCategories.map((item) => (
                  <button
                    key={item}
                    className={`chip ${category === item ? 'chip-active' : ''}`}
                    onClick={() => chooseDepartment(item)}
                  >
                    {item}
                  </button>
                ))}
                <button className={`chip ${category === 'All' ? 'chip-active' : ''}`} onClick={resetCatalogNavigation}>
                  Reset
                </button>
              </section>
            ) : null}

            <section className="filters mini-top">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, department, collection"
              />
              <select value={category} onChange={(e) => chooseDepartment(e.target.value)}>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={subcategory}
                onChange={(e) => chooseCollection(e.target.value)}
                disabled={category === 'All'}
              >
                {subcategoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </section>

            {storefrontScreen === 'departments' ? (
              <section className="trust-grid mini-top">
                {visibleDepartmentCards.map((item) => {
                  const itemCount = searchFilteredCatalogProducts.filter((entry) => entry.department === item).length;
                  return (
                    <article className="trust-card clickable-card" key={`dept-${item}`} onClick={() => chooseDepartment(item)}>
                      <h4>{item}</h4>
                      <p className="muted">{itemCount} products</p>
                    </article>
                  );
                })}
                {visibleDepartmentCards.length === 0 ? <div className="state-card">No departments found for this search.</div> : null}
              </section>
            ) : null}

            {storefrontScreen === 'collections' ? (
              <section className="trust-grid mini-top">
                {visibleCollectionCards.map((item) => {
                  const itemCount = searchFilteredCatalogProducts.filter((entry) => entry.department === category && entry.collection === item).length;
                  return (
                    <article className="trust-card clickable-card" key={`collection-${item}`} onClick={() => chooseCollection(item)}>
                      <h4>{item}</h4>
                      <p className="muted">{itemCount} products in {category}</p>
                    </article>
                  );
                })}
                {visibleCollectionCards.length === 0 ? <div className="state-card">No collections found for this department.</div> : null}
              </section>
            ) : null}

            {storefrontScreen === 'products' ? (
              <section ref={productsSectionRef} className="product-grid mini-top">
                {filteredProducts.length > 0 ? (
                  <div className="catalog-pagination">
                    <p className="muted small">
                      Showing {storefrontProductsRange.start}-{storefrontProductsRange.end} of {filteredProducts.length} products
                    </p>
                    <div className="catalog-pagination-controls">
                      <button
                        type="button"
                        className="ghost catalog-pagination-arrow"
                        onClick={() => setStorefrontProductsPage((prev) => Math.max(1, prev - 1))}
                        disabled={storefrontProductsPage <= 1}
                      >
                        Prev
                      </button>
                      {storefrontPageNumbers.map((pageNumber, index) =>
                        pageNumber > 0 ? (
                          <button
                            key={`catalog-page-${pageNumber}`}
                            type="button"
                            className={`ghost catalog-pagination-number ${storefrontProductsPage === pageNumber ? 'catalog-pagination-number-active' : ''}`}
                            onClick={() => setStorefrontProductsPage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        ) : (
                          <span key={`catalog-page-gap-${index}`} className="catalog-pagination-ellipsis" aria-hidden="true">
                            ...
                          </span>
                        ),
                      )}
                      <button
                        type="button"
                        className="ghost catalog-pagination-arrow"
                        onClick={() => setStorefrontProductsPage((prev) => Math.min(totalStorefrontProductPages, prev + 1))}
                        disabled={storefrontProductsPage >= totalStorefrontProductPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
                {paginatedFilteredProducts.map((product, idx) => (
                  <motion.article
                    className="product-card clickable-card"
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.02 }}
                    onClick={() => setSelectedProductDetail(product)}
                  >
                    <div className="product-image" style={{ background: productGradient(product) }}>
                      {product.image_url ? (
                        <img src={product.image_url} alt={productDisplayName(product.name)} />
                      ) : (
                        <span>{productCategoryLabel(product.category)}</span>
                      )}
                    </div>
                    <div className="product-body">
                      <div className="product-card-head">
                        <h3 className="product-title">{productDisplayName(product.name)}</h3>
                        <div className="product-card-statuses">
                          {product.compare_at_price > product.price ? (
                            <span className="status offer product-card-offer-status">
                              {Math.max(1, Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100))}% OFF
                            </span>
                          ) : (
                            <span className="status offer product-card-offer-status status-placeholder" aria-hidden="true">
                              00% OFF
                            </span>
                          )}
                          <span className={statusClass(product.inventory > 0 ? 'available' : 'sold')}>{product.inventory > 0 ? 'In stock' : 'Out'}</span>
                        </div>
                      </div>
                      <p className="muted product-description">
                        {product.short_description?.trim() || product.description}
                      </p>
                      <p className="muted small product-meta">
                        {productBrandLabel(product.brand, '') ? `${productBrandLabel(product.brand, '')} • ` : ''}
                        {product.unit_value} {product.unit} • {productCategoryLabel(product.category)}
                        {productSubcategoryLabel(product.subcategory, '') ? ` • ${productSubcategoryLabel(product.subcategory, '')}` : ''}
                      </p>
                      <div className="row between">
                        <div className="product-price-block">
                          <strong className="product-price">{money(product.price)}</strong>
                          <small className="line">{money(product.compare_at_price)}</small>
                        </div>
                        <button
                          className="primary"
                          disabled={product.inventory <= 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))}
                {filteredProducts.length === 0 ? <div className="state-card">No products found for selected catalog filters.</div> : null}
              </section>
            ) : null}
          </section>

          <section className="trust-grid">
            <article className="trust-card">
              <h4>Assured Quality</h4>
              <p className="muted">Every product is packed after quality checks by our fulfillment team.</p>
            </article>
            <article className="trust-card">
              <h4>Reliable Delivery</h4>
              <p className="muted">Realtime order status with clear delivery flow and support notifications.</p>
            </article>
            <article className="trust-card">
              <h4>Secure Shopping</h4>
              <p className="muted">Authenticated user sessions and role-based dashboards for operations.</p>
            </article>
          </section>
        </>
      ) : null}

      {isUser && activePage === 'user-orders' ? (
        <UserOrdersPage
          history={history}
          sessionFullName={session?.full_name}
          onOpenOrder={openOrder}
        />
      ) : null}

      {isAdmin && activePage === 'admin-orders' ? (
        <AdminOrdersPage
          adminOrders={adminOrders}
          runningAdminOrders={runningAdminOrders}
          deliveredAdminOrders={deliveredAdminOrders}
          filteredAdminOrders={filteredAdminOrders}
          adminOrdersSearch={adminOrdersSearch}
          adminOrdersStatusFilter={adminOrdersStatusFilter}
          adminOrderStatusOptions={adminOrderStatusOptions}
          adminOrderStatusUpdatingId={adminOrderStatusUpdatingId}
          setAdminOrdersSearch={setAdminOrdersSearch}
          setAdminOrdersStatusFilter={setAdminOrdersStatusFilter}
          onOpenOrder={openOrder}
          onUpdateAdminOrder={updateAdminOrder}
        />
      ) : null}

      {isAdmin && activePage === 'admin-products' ? (
        <motion.section
          className="admin-grid admin-page-full"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="panel">
            <div className="products-head-row">
              <div>
                <h3>Products Catalog</h3>
                <p className="muted">
                  Manage products from database-synced catalog names, pricing, and stock.
                </p>
                <p className="muted small">Name fields ready: {productsWithValidNamesCount}/{products.length}</p>
              </div>
              <div className="products-head-stats">
                <article className="products-stat">
                  <span>Total</span>
                  <strong>{products.length}</strong>
                </article>
                <article className="products-stat">
                  <span>Low Stock</span>
                  <strong>{lowStockProducts.length}</strong>
                </article>
                <article className="products-stat">
                  <span>Out of Stock</span>
                  <strong>{outOfStockProducts.length}</strong>
                </article>
              </div>
            </div>

            <div className="admin-products-top-row mini-top">
              <div className="admin-products-carousel-wrap">
                <div className="low-stock-carousel-head">
                  <div>
                    <h4>Low Stock Products</h4>
                    <p className="muted small">
                      Showing {lowStockCarouselProducts.length} of {lowStockProducts.length}
                    </p>
                  </div>
                  <div className="row low-stock-carousel-controls">
                    <button type="button" className="ghost" onClick={() => scrollLowStockCarousel('left', 'admin')}>◀</button>
                    <button type="button" className="ghost" onClick={() => scrollLowStockCarousel('right', 'admin')}>▶</button>
                  </div>
                </div>
                {lowStockProducts.length > 0 ? (
                  <div ref={adminLowStockCarouselRef} className="low-stock-carousel mini-top">
                    {lowStockCarouselProducts.map((p) => (
                      <article className={`admin-product-card low-stock-slide ${p.inventory <= 0 ? 'stock-out' : 'stock-low'}`} key={`low-${p.id}`}>
                        <div className="admin-product-card-head">
                          <strong>{productDisplayName(p.name)}</strong>
                          <span className={`stock-pill ${p.inventory <= 0 ? 'stock-pill-out' : 'stock-pill-low'}`}>
                            {p.inventory <= 0 ? 'Out of stock' : `Only ${p.inventory} left`}
                          </span>
                        </div>
                        <p className="muted admin-product-sub">
                          {productBrandLabel(p.brand, '') ? `${productBrandLabel(p.brand, '')} • ` : ''}
                          {productCategoryLabel(p.category)}
                          {productSubcategoryLabel(p.subcategory, '') ? ` / ${productSubcategoryLabel(p.subcategory, '')}` : ''}
                          {' • '}
                          {p.unit_value} {p.unit}
                        </p>
                        <div className="row between">
                          <strong>{money(p.price)}</strong>
                          <small className="line">{money(p.compare_at_price)}</small>
                        </div>
                        <div className="row">
                          <button type="button" className="ghost" onClick={() => editAdminProduct(p)}>Update</button>
                          <button
                            type="button"
                            className="ghost danger"
                            onClick={() => askDeleteAdminProduct(p.id)}
                            disabled={adminProductDeletingId === p.id}
                          >
                            {adminProductDeletingId === p.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="state-card mini-top">No low stock products right now.</div>
                )}
              </div>

              <aside className="admin-products-action">
                <h4>Quick Action</h4>
                <p className="muted">Add a new product using the same category style as your ecommerce app form.</p>
                <button type="button" className="primary full" onClick={openNewAdminProductForm}>
                  New Product
                </button>
              </aside>
            </div>

            <div className="mini-top">
              <div className="row between">
                <h4>{adminProductsHeading}</h4>
                <p className="muted small">Showing {filteredAdminProducts.length} of {products.length}</p>
              </div>
              {isAdminProductsSearching ? (
                <div className="state-card mini-top">Searching catalog...</div>
              ) : null}
              <div className="admin-products-filters mini-top">
                <input
                  placeholder="Search by name, description, or category"
                  value={adminProductsSearch}
                  onChange={(e) => setAdminProductsSearch(e.target.value)}
                />
                <select
                  value={adminProductsCategoryFilter}
                  onChange={(e) => setAdminProductsCategoryFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {adminCategoryOptions.map((category) => (
                    <option key={`filter-${category}`} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={adminProductsStockFilter}
                  onChange={(e) => setAdminProductsStockFilter(e.target.value as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock')}
                >
                  <option value="all">All Stock</option>
                  <option value="in_stock">In Stock ({'>'}{LOW_STOCK_THRESHOLD})</option>
                  <option value="low_stock">Low Stock (1-{LOW_STOCK_THRESHOLD})</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
              {filteredAdminProducts.length > 0 ? (
                <div className="catalog-pagination mini-top">
                  <p className="muted small">
                    Showing {adminProductsRange.start}-{adminProductsRange.end} of {filteredAdminProducts.length} products
                  </p>
                  <div className="catalog-pagination-controls">
                    <button
                      type="button"
                      className="ghost catalog-pagination-arrow"
                      onClick={() => setAdminProductsPage((prev) => Math.max(1, prev - 1))}
                      disabled={adminProductsPage <= 1}
                    >
                      Prev
                    </button>
                    {adminProductsPageNumbers.map((pageNumber, index) =>
                      pageNumber > 0 ? (
                        <button
                          key={`admin-catalog-page-${pageNumber}`}
                          type="button"
                          className={`ghost catalog-pagination-number ${adminProductsPage === pageNumber ? 'catalog-pagination-number-active' : ''}`}
                          onClick={() => setAdminProductsPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      ) : (
                        <span key={`admin-catalog-page-gap-${index}`} className="catalog-pagination-ellipsis" aria-hidden="true">
                          ...
                        </span>
                      ),
                    )}
                    <button
                      type="button"
                      className="ghost catalog-pagination-arrow"
                      onClick={() => setAdminProductsPage((prev) => Math.min(totalAdminProductPages, prev + 1))}
                      disabled={adminProductsPage >= totalAdminProductPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="admin-product-cards">
                {paginatedAdminProducts.map((p) => (
                  <article
                    className={`admin-product-card ${p.inventory <= 0 ? 'stock-out' : p.inventory <= LOW_STOCK_THRESHOLD ? 'stock-low' : 'stock-ok'}`}
                    key={p.id}
                  >
                    <div className="admin-product-image-wrap">
                      {p.image_url ? <img src={p.image_url} alt={productDisplayName(p.name)} className="admin-product-image" /> : <span>{productCategoryLabel(p.category)}</span>}
                    </div>
                    <div className="admin-product-card-head">
                      <strong>{productDisplayName(p.name)}</strong>
                      <span
                        className={`stock-pill ${
                          p.inventory <= 0 ? 'stock-pill-out' : p.inventory <= LOW_STOCK_THRESHOLD ? 'stock-pill-low' : 'stock-pill-ok'
                        }`}
                      >
                        {p.inventory <= 0 ? 'Out' : `Stock ${p.inventory}`}
                      </span>
                    </div>
                    <p className="muted admin-product-sub">{p.description}</p>
                    <p className="muted small">
                      {productBrandLabel(p.brand, '') ? `${productBrandLabel(p.brand, '')} • ` : ''}
                      {productCategoryLabel(p.category)}
                      {productSubcategoryLabel(p.subcategory, '') ? ` / ${productSubcategoryLabel(p.subcategory, '')}` : ''}
                      {' • '}
                      {p.unit_value} {p.unit}
                      {' • '}
                      Rating {p.rating}
                    </p>
                    <div className="row between">
                      <strong>{money(p.price)}</strong>
                      <small className="line">{money(p.compare_at_price)}</small>
                    </div>
                    <div className="row">
                      <button type="button" className="ghost" onClick={() => editAdminProduct(p)}>Update</button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => askDeleteAdminProduct(p.id)}
                        disabled={adminProductDeletingId === p.id}
                      >
                        {adminProductDeletingId === p.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {filteredAdminProducts.length === 0 ? (
                <div className="state-card mini-top">No products found for selected filters.</div>
              ) : null}
            </div>
          </div>
        </motion.section>
      ) : null}

      {isAdmin && activePage === 'admin-catalog' ? (
        <AdminCatalogPage
          productsCount={products.length}
          suppliersCount={suppliers.length}
          lowStockCount={lowStockProducts.length}
          catalogImportForm={catalogImportForm}
          catalogImportBusy={catalogImportBusy}
          catalogImportResult={catalogImportResult}
          setCatalogImportForm={setCatalogImportForm}
          onImport={handleCatalogImport}
        />
      ) : null}

      {isAdmin && activePage === 'admin-suppliers' ? (
        <motion.section
          className="admin-grid admin-page-full"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div ref={suppliersPanelRef} className="panel">
            <div className="products-head-row">
              <div>
                <h3>Suppliers</h3>
                <p className="muted">Create suppliers, raise supply requests, and track request status in one place.</p>
              </div>
              <div className="products-head-stats">
                <article className="products-stat">
                  <span>Total Suppliers</span>
                  <strong>{suppliers.length}</strong>
                </article>
                <article className="products-stat">
                  <span>Pending Requests</span>
                  <strong>{pendingSupplyOrders}</strong>
                </article>
                <article className="products-stat">
                  <span>Total Requests</span>
                  <strong>{adminSupplyOrders.length}</strong>
                </article>
              </div>
            </div>

            <div className="admin-products-top-row mini-top">
              <div className="admin-products-carousel-wrap">
                <div className="row between">
                  <h4>Pending Supply Requests</h4>
                  <div className="row">
                    <button type="button" className="ghost" onClick={() => scrollSupplyOrderCarousel('left')}>◀</button>
                    <button type="button" className="ghost" onClick={() => scrollSupplyOrderCarousel('right')}>▶</button>
                  </div>
                </div>
                {pendingSupplyOrderCards.length > 0 ? (
                  <div ref={supplyOrderCarouselRef} className="low-stock-carousel mini-top">
                    {pendingSupplyOrderCards.map((order) => (
                      <article
                        className="admin-product-card low-stock-slide pending-request-card clickable-card"
                        key={`pending-${order.supply_order_id}`}
                        onClick={() => setSelectedSupplyHistory(order)}
                      >
                        <div className="admin-product-card-head">
                          <div className="icon-title">
                            <span className="entity-icon" aria-hidden="true"><AppIcon name="hourglass" /></span>
                            <strong>Pending Request</strong>
                          </div>
                          <div className="supply-card-top-actions">
                            <span className="stock-pill stock-pill-low">Pending</span>
                            <button
                              type="button"
                              className="ghost history-icon-btn"
                              aria-label="Open request history"
                              title="History"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSupplyHistory(order);
                              }}
                            >
                              <AppIcon name="history" />
                            </button>
                          </div>
                        </div>
                        <p className="muted admin-product-sub">{order.supplier_name} • {order.title}</p>
                        <p className="muted small">Qty {order.quantity} • {formatTime(order.created_at)}</p>
                        <button
                          type="button"
                          className="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            void updateAdminSupplyStatus(order.supply_order_id, 'accepted');
                          }}
                          disabled={
                            order.status !== 'pending' ||
                            adminSupplyStatusUpdatingId === order.supply_order_id
                          }
                        >
                          {adminSupplyStatusUpdatingId === order.supply_order_id ? 'Updating...' : 'Mark Accepted'}
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="state-card mini-top">No pending supply requests right now.</div>
                )}
              </div>

              <aside className="admin-products-action">
                <h4>Quick Actions</h4>
                <p className="muted">Create suppliers and raise supply requests from one place.</p>
                <button type="button" className="primary full" onClick={openSupplierCreateModal}>
                  New Supplier
                </button>
                <button
                  type="button"
                  className="ghost full"
                  onClick={openSupplyRequestModal}
                  disabled={suppliers.length === 0}
                >
                  New Supply Request
                </button>
              </aside>
            </div>

            <div className="mini-top">
              <div className="row between">
                <h4>All Suppliers</h4>
                <p className="muted small">Showing {filteredSuppliers.length} of {suppliers.length}</p>
              </div>
              <div className="admin-suppliers-filters mini-top">
                <input
                  placeholder="Search supplier by name, email, phone, address"
                  value={suppliersSearch}
                  onChange={(e) => setSuppliersSearch(e.target.value)}
                />
              </div>
              <div className="admin-product-cards">
                {filteredSuppliers.map((supplier) => (
                  <article
                    className="admin-product-card supplier-card clickable-card"
                    key={supplier.user_id}
                    onClick={() => setSelectedSupplierDetail(supplier)}
                  >
                    <div className="admin-product-card-head">
                      <div className="icon-title">
                        <span className="entity-icon" aria-hidden="true"><AppIcon name="factory" /></span>
                        <strong>{supplier.full_name}</strong>
                      </div>
                      <span className="stock-pill stock-pill-ok">{supplier.phone}</span>
                    </div>
                    <p className="muted admin-product-sub">{supplier.email}</p>
                    <p className="muted small">{supplier.address}</p>
                    <div className="row between">
                      <span className="muted small">Joined {formatTime(supplier.created_at)}</span>
                      <button
                        type="button"
                        className="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSupplierId(supplier.user_id);
                          openSupplyRequestModal();
                        }}
                      >
                        Create Request
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {filteredSuppliers.length === 0 ? (
                <div className="state-card mini-top">No suppliers found for your search.</div>
              ) : null}
            </div>

            <div className="mini-top">
              <div className="row between">
                <h4>Supply Requests</h4>
                <p className="muted small">Showing {filteredSupplyOrders.length} of {adminSupplyOrders.length}</p>
              </div>
              <div className="admin-supply-filters mini-top">
                <input
                  placeholder="Search by request id, supplier, title, notes"
                  value={supplyOrdersSearch}
                  onChange={(e) => setSupplyOrdersSearch(e.target.value)}
                />
                <select
                  value={supplyOrdersStatusFilter}
                  onChange={(e) => setSupplyOrdersStatusFilter(e.target.value as 'all' | SupplyOrder['status'])}
                >
                  <option value="all">All Statuses</option>
                  {SUPPLY_ORDER_STATUS_OPTIONS.map((status) => (
                    <option key={`status-${status}`} value={status}>{formatStatusText(status)}</option>
                  ))}
                </select>
              </div>
              <div className="admin-product-cards">
                {filteredSupplyOrders.map((order) => (
                  (() => {
                    const allowedTransitions = allowedAdminSupplyTransitions(order.status);
                    const selectableStatuses = [order.status, ...allowedTransitions];
                    const isLocked = allowedTransitions.length === 0;
                    const isUpdating = adminSupplyStatusUpdatingId === order.supply_order_id;
                    return (
                  <article
                    className={`admin-product-card supply-request-card clickable-card ${
                      order.status === 'rejected'
                        ? 'stock-out'
                        : order.status === 'pending'
                          ? 'stock-low'
                          : 'stock-ok'
                    }`}
                    key={order.supply_order_id}
                    onClick={() => setSelectedSupplyHistory(order)}
                  >
                    <div className="admin-product-card-head">
                      <div className="icon-title">
                        <span className="entity-icon" aria-hidden="true"><AppIcon name="package" /></span>
                        <strong>{order.title}</strong>
                      </div>
                      <div className="supply-card-top-actions">
                        <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
                        <button
                          type="button"
                          className="ghost history-icon-btn"
                          aria-label="Open request history"
                          title="History"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSupplyHistory(order);
                          }}
                        >
                          <AppIcon name="history" />
                        </button>
                      </div>
                    </div>
                    <p className="muted admin-product-sub">{order.supplier_name}</p>
                    <p className="muted small">{order.notes || 'No notes provided'}</p>
                    <p className="muted small">Qty {order.quantity} • {formatTime(order.created_at)}</p>
                    <select
                      value={order.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => void updateAdminSupplyStatus(order.supply_order_id, e.target.value)}
                      disabled={isLocked || isUpdating}
                    >
                      {selectableStatuses.map((status) => (
                        <option key={`${order.supply_order_id}-${status}`} value={status}>{formatStatusText(status)}</option>
                      ))}
                    </select>
                    <div className="row between">
                      <span className="muted small">{isUpdating ? 'Updating status...' : ''}</span>
                    </div>
                  </article>
                    );
                  })()
                ))}
              </div>
              {filteredSupplyOrders.length === 0 ? (
                <div className="state-card mini-top">No supply requests found for selected filters.</div>
              ) : null}
            </div>
          </div>
        </motion.section>
      ) : null}

      <AnimatePresence>
        {showAdminProductForm ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>
              <div className="row between">
                <h3>{editingAdminProductId ? 'Update Product' : 'Create Product'}</h3>
                <button type="button" className="ghost close-icon-btn" aria-label="Close dialog" onClick={resetAdminProductEditor} disabled={adminProductBusy}>
                  <AppIcon name="x" />
                </button>
              </div>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveAdminProduct();
                }}
              >
                <div className="field">
                  <label className="field-label">Name</label>
                  <input
                    placeholder="Name"
                    value={adminProductForm.name}
                    onChange={(e) => setAdminProductForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Description</label>
                  <input
                    placeholder="Description"
                    value={adminProductForm.description}
                    onChange={(e) => setAdminProductForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Short Description</label>
                  <input
                    placeholder="Short Description"
                    value={adminProductForm.short_description}
                    onChange={(e) => setAdminProductForm((p) => ({ ...p, short_description: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Category</label>
                  <input
                    list="admin-product-categories"
                    placeholder="Category"
                    value={adminProductForm.category}
                    onChange={(e) => setAdminProductForm((p) => ({ ...p, category: e.target.value }))}
                  />
                </div>
                <div className="row">
                  <div className="field grow-field">
                    <label className="field-label">Subcategory</label>
                    <input
                      placeholder="Subcategory"
                      value={adminProductForm.subcategory}
                      onChange={(e) => setAdminProductForm((p) => ({ ...p, subcategory: e.target.value }))}
                    />
                  </div>
                  <div className="field grow-field">
                    <label className="field-label">Brand</label>
                    <input
                      placeholder="Brand"
                      value={adminProductForm.brand}
                      onChange={(e) => setAdminProductForm((p) => ({ ...p, brand: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Slug</label>
                  <input
                    placeholder="Slug (optional)"
                    value={adminProductForm.slug}
                    onChange={(e) => setAdminProductForm((p) => ({ ...p, slug: e.target.value }))}
                  />
                </div>
                <div className="row">
                  <div className="field grow-field">
                    <label className="field-label">Currency</label>
                    <input
                      placeholder="Currency"
                      value={adminProductForm.currency}
                      maxLength={8}
                      onChange={(e) => setAdminProductForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))}
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="field grow-field">
                    <label className="field-label">Tax %</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Tax %"
                      value={adminProductForm.tax_percent}
                      onChange={(e) => setAdminProductForm((p) => ({ ...p, tax_percent: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="field grow-field">
                    <label className="field-label">Stock Status</label>
                    <select
                      value={adminProductForm.stock_status}
                      onChange={(e) => setAdminProductForm((p) => ({ ...p, stock_status: e.target.value }))}
                    >
                      <option value="in_stock">In Stock</option>
                      <option value="low_stock">Low Stock</option>
                      <option value="out_of_stock">Out Of Stock</option>
                    </select>
                  </div>
                </div>
                <datalist id="admin-product-categories">
                  {adminCategoryOptions.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
                <div className="row">
                  <div className="field grow-field">
                    <label className="field-label">Price</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="Price"
                      value={adminProductForm.price}
                      onChange={(e) => setAdminProductForm((p) => ({ ...p, price: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="field grow-field">
                    <label className="field-label">Compare Price</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="Compare Price"
                      value={adminProductForm.compare_at_price}
                      onChange={(e) => setAdminProductForm((p) => ({ ...p, compare_at_price: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="field grow-field">
                    <label className="field-label">Rating</label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      placeholder="Rating"
                      value={adminProductForm.rating}
                      onChange={(e) => setAdminProductForm((p) => ({ ...p, rating: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="field grow-field">
                    <label className="field-label">Inventory</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Inventory"
                      value={adminProductForm.inventory}
                      onChange={(e) => setAdminProductForm((p) => ({ ...p, inventory: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="field grow-field">
                    <label className="field-label">Unit</label>
                    <select
                      value={adminProductForm.unit}
                      onChange={(e) => setAdminProductForm((p) => ({ ...p, unit: e.target.value }))}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field grow-field">
                    <label className="field-label">Unit Value</label>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      placeholder="Unit value"
                      value={adminProductForm.unit_value}
                      onChange={(e) => setAdminProductForm((p) => ({ ...p, unit_value: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAdminProductForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
                  />
                </div>
                <div className="row">
                  <button className="primary" disabled={adminProductBusy}>
                    {adminProductBusy ? 'Saving...' : editingAdminProductId ? 'Update Product' : 'Create Product'}
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={resetAdminProductEditor}
                    disabled={adminProductBusy}
                  >
                    {editingAdminProductId ? 'Cancel Edit' : 'Close Form'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showSupplierProductForm ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>
              <div className="row between">
                <h3>{editingSupplierProductId ? 'Update Product' : 'Create Product'}</h3>
                <button type="button" className="ghost close-icon-btn" aria-label="Close dialog" onClick={resetSupplierProductEditor} disabled={supplierProductBusy}>
                  <AppIcon name="x" />
                </button>
              </div>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void createSupplierProductAction();
                }}
              >
                <div className="field">
                  <label className="field-label">Name</label>
                  <input
                    placeholder="Name"
                    value={supplierProductForm.name}
                    onChange={(e) => setSupplierProductForm((p) => ({ ...p, name: e.target.value }))}
                    disabled={supplierProductBusy}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Description</label>
                  <input
                    placeholder="Description"
                    value={supplierProductForm.description}
                    onChange={(e) => setSupplierProductForm((p) => ({ ...p, description: e.target.value }))}
                    disabled={supplierProductBusy}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Category</label>
                  <input
                    list="supplier-product-categories"
                    placeholder="Category"
                    value={supplierProductForm.category}
                    onChange={(e) => setSupplierProductForm((p) => ({ ...p, category: e.target.value }))}
                    disabled={supplierProductBusy}
                  />
                </div>
                <datalist id="supplier-product-categories">
                  {Array.from(new Set([...ECOMMERCE_DEFAULT_CATEGORIES, ...supplierCategoryOptions])).map((category) => (
                    <option key={`supplier-category-option-${category}`} value={category} />
                  ))}
                </datalist>
                <div className="row">
                  <div className="field grow-field">
                    <label className="field-label">Price</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="Price"
                      value={supplierProductForm.price}
                      onChange={(e) => setSupplierProductForm((p) => ({ ...p, price: Number(e.target.value) }))}
                      disabled={supplierProductBusy}
                    />
                  </div>
                  <div className="field grow-field">
                    <label className="field-label">Inventory</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Inventory"
                      value={supplierProductForm.inventory}
                      onChange={(e) => setSupplierProductForm((p) => ({ ...p, inventory: Number(e.target.value) }))}
                      disabled={supplierProductBusy}
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="field grow-field">
                    <label className="field-label">Unit</label>
                    <select
                      value={supplierProductForm.unit}
                      onChange={(e) => setSupplierProductForm((p) => ({ ...p, unit: e.target.value }))}
                      disabled={supplierProductBusy}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field grow-field">
                    <label className="field-label">Unit Value</label>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      placeholder="Unit value"
                      value={supplierProductForm.unit_value}
                      onChange={(e) => setSupplierProductForm((p) => ({ ...p, unit_value: Number(e.target.value) }))}
                      disabled={supplierProductBusy}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSupplierProductForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
                    disabled={supplierProductBusy}
                  />
                </div>
                <div className="row">
                  <button className="primary" disabled={supplierProductBusy}>
                    {supplierProductBusy ? 'Saving...' : editingSupplierProductId ? 'Update Product' : 'Create Product'}
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={resetSupplierProductEditor}
                    disabled={supplierProductBusy}
                  >
                    {editingSupplierProductId ? 'Cancel Edit' : 'Close Form'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteProduct ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>
              <h3>Delete Product</h3>
              <p className="muted">
                Are you sure you want to delete <strong>{confirmDeleteProduct.name}</strong>?
              </p>
              <p className="muted small">This action cannot be undone.</p>
              <div className="row mini-top">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setConfirmDeleteProduct(null)}
                  disabled={adminProductDeletingId === confirmDeleteProduct.id}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ghost danger"
                  onClick={() => void deleteAdminProduct(confirmDeleteProduct.id)}
                  disabled={adminProductDeletingId === confirmDeleteProduct.id}
                >
                  {adminProductDeletingId === confirmDeleteProduct.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showSupplierCreateForm ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>
              <div className="row between">
                <h3>Create Supplier</h3>
                <button type="button" className="ghost close-icon-btn" aria-label="Close dialog" onClick={() => setShowSupplierCreateForm(false)} disabled={supplierCreateBusy}>
                  <AppIcon name="x" />
                </button>
              </div>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void createSupplierAccount();
                }}
              >
                <input
                  placeholder="Name"
                  value={supplierCreateForm.username}
                  onChange={(e) => setSupplierCreateForm((p) => ({ ...p, username: e.target.value }))}
                />
                <input
                  placeholder="Email"
                  value={supplierCreateForm.email}
                  onChange={(e) => setSupplierCreateForm((p) => ({ ...p, email: e.target.value }))}
                />
                <div className="row">
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-country-code"
                    maxLength={COUNTRY_CODE_MAX_LENGTH}
                    placeholder="Country code"
                    value={supplierCreateForm.country_code}
                    onChange={(e) => setSupplierCreateForm((p) => ({ ...p, country_code: sanitizeCountryCodeInput(e.target.value) }))}
                    onBlur={(e) => {
                      if (e.target.value === '+') {
                        setSupplierCreateForm((p) => ({ ...p, country_code: '+91' }));
                      }
                    }}
                  />
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={PHONE_MAX_LENGTH}
                    placeholder="Phone"
                    value={supplierCreateForm.phone}
                    onChange={(e) => setSupplierCreateForm((p) => ({ ...p, phone: sanitizePhoneInput(e.target.value) }))}
                  />
                </div>
                <input
                  placeholder="Address"
                  value={supplierCreateForm.address}
                  onChange={(e) => setSupplierCreateForm((p) => ({ ...p, address: e.target.value }))}
                />
                <div className="password-field-wrap">
                  <input
                    type={showSupplierCreatePassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={supplierCreateForm.password}
                    onChange={(e) => setSupplierCreateForm((p) => ({ ...p, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    aria-label={showSupplierCreatePassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowSupplierCreatePassword((prev) => !prev)}
                  >
                    <AppIcon name={showSupplierCreatePassword ? 'eyeOff' : 'eye'} />
                  </button>
                </div>
                <div className="row">
                  <button className="primary" disabled={supplierCreateBusy}>
                    {supplierCreateBusy ? 'Creating...' : 'Create Supplier'}
                  </button>
                  <button type="button" className="ghost" onClick={() => setShowSupplierCreateForm(false)} disabled={supplierCreateBusy}>
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showSupplyCreateForm ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>
              <div className="row between">
                <h3>Create Supply Request</h3>
                <button type="button" className="ghost close-icon-btn" aria-label="Close dialog" onClick={() => setShowSupplyCreateForm(false)} disabled={supplyCreateBusy}>
                  <AppIcon name="x" />
                </button>
              </div>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void createSupplyOrderByAdmin();
                }}
              >
                <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)}>
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={`modal-supplier-${supplier.user_id}`} value={supplier.user_id}>
                      {supplier.full_name}
                    </option>
                  ))}
                </select>
                <select
                  value={supplyCreateForm.product_id}
                  onChange={(e) => setSupplyCreateForm((p) => ({ ...p, product_id: e.target.value }))}
                  disabled={!selectedSupplierId || supplierProducts.length === 0}
                >
                  <option value="">Select supplier product</option>
                  {supplierProducts.map((product) => (
                    <option key={`modal-product-${product.id}`} value={product.id}>
                      {productDisplayName(product.name)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Requested quantity"
                  value={supplyCreateForm.unit_value}
                  onChange={(e) => setSupplyCreateForm((p) => ({ ...p, unit_value: Number(e.target.value) }))}
                />
                <input
                  placeholder="Notes"
                  value={supplyCreateForm.notes}
                  onChange={(e) => setSupplyCreateForm((p) => ({ ...p, notes: e.target.value }))}
                />
                <div className="row">
                  <button
                    className="primary"
                    disabled={
                      supplyCreateBusy ||
                      !selectedSupplierId ||
                      !supplyCreateForm.product_id ||
                      Number(supplyCreateForm.unit_value) <= 0
                    }
                  >
                    {supplyCreateBusy ? 'Creating...' : 'Create Request'}
                  </button>
                  <button type="button" className="ghost" onClick={() => setShowSupplyCreateForm(false)} disabled={supplyCreateBusy}>
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProductDetail ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProductDetail(null)}>
            <motion.div
              className="dialog dialog-fullscreen product-detail-dialog"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="product-detail-header">
                <div className="product-detail-title-wrap">
                  <p className="label">Product Details</p>
                  <h3>{productDisplayName(selectedProductDetail.name)}</h3>
                  <p className="muted small product-detail-subtitle">
                    {productBrandLabel(selectedProductDetail.brand, 'Generic')}
                    {' • '}
                    {productCategoryLabel(selectedProductDetail.category)}
                    {productSubcategoryLabel(selectedProductDetail.subcategory, '') ? ` / ${productSubcategoryLabel(selectedProductDetail.subcategory, '')}` : ''}
                  </p>
                </div>
                <button type="button" className="ghost close-icon-btn" aria-label="Close product details" onClick={() => setSelectedProductDetail(null)}>
                  <AppIcon name="x" />
                </button>
              </div>
              <div className="product-detail-layout">
                <div className="product-detail-image-wrap" style={{ background: productGradient(selectedProductDetail) }}>
                  {selectedProductDetail.image_url ? (
                    <img src={selectedProductDetail.image_url} alt={productDisplayName(selectedProductDetail.name)} className="product-detail-image" />
                  ) : (
                    <span>{productCategoryLabel(selectedProductDetail.category)}</span>
                  )}
                </div>
                <div className="stack product-detail-info">
                  <div className="product-detail-badges">
                    {selectedProductDetail.compare_at_price > selectedProductDetail.price ? (
                      <span className="status offer">
                        {Math.max(1, Math.round(((selectedProductDetail.compare_at_price - selectedProductDetail.price) / selectedProductDetail.compare_at_price) * 100))}% OFF
                      </span>
                    ) : null}
                    <span className="status review-star">★ {selectedProductDetail.rating.toFixed(1)}</span>
                    <span className={statusClass(selectedProductDetail.inventory > 0 ? 'available' : 'sold')}>
                      {selectedProductDetail.inventory > 0 ? 'In Stock' : 'Out Of Stock'}
                    </span>
                  </div>
                  <p className="muted product-detail-description">
                    {selectedProductDetail.short_description?.trim() || selectedProductDetail.description}
                  </p>
                  <div className="product-detail-facts">
                    <article className="product-detail-fact">
                      <span>Brand</span>
                      <strong>{productBrandLabel(selectedProductDetail.brand, 'Generic')}</strong>
                    </article>
                    <article className="product-detail-fact">
                      <span>Unit Size</span>
                      <strong>{selectedProductDetail.unit_value} {selectedProductDetail.unit}</strong>
                    </article>
                    <article className="product-detail-fact">
                      <span>Available Qty</span>
                      <strong>{selectedProductDetail.inventory}</strong>
                    </article>
                    <article className="product-detail-fact">
                      <span>Tax</span>
                      <strong>{selectedProductDetail.tax_percent != null ? `GST ${selectedProductDetail.tax_percent}%` : 'Included'}</strong>
                    </article>
                  </div>
                  <div className="product-detail-price">
                    <div className="product-detail-price-block">
                      <strong className="product-price">{money(selectedProductDetail.price)}</strong>
                      {selectedProductDetail.compare_at_price > selectedProductDetail.price ? (
                        <>
                          <small className="line">{money(selectedProductDetail.compare_at_price)}</small>
                          <p className="muted small">Save {money(selectedProductDetail.compare_at_price - selectedProductDetail.price)}</p>
                        </>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="primary"
                      disabled={selectedProductDetail.inventory <= 0}
                      onClick={() => addToCart(selectedProductDetail)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedSupplierDetail ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <div className="row between">
                <h3>Supplier Details</h3>
                <button type="button" className="ghost close-icon-btn" aria-label="Close supplier details" onClick={() => setSelectedSupplierDetail(null)}>
                  <AppIcon name="x" />
                </button>
              </div>
              <div className="tile">
                <div className="icon-title">
                  <span className="entity-icon" aria-hidden="true"><AppIcon name="factory" /></span>
                  <strong>{selectedSupplierDetail.full_name}</strong>
                </div>
                <span className="stock-pill stock-pill-ok">{selectedSupplierDetail.phone}</span>
              </div>
              <div className="stack">
                <div className="tile">
                  <span>Email</span>
                  <strong>{selectedSupplierDetail.email}</strong>
                </div>
                <div className="tile">
                  <span>Address</span>
                  <strong>{selectedSupplierDetail.address}</strong>
                </div>
                <div className="tile">
                  <span>Joined</span>
                  <strong>{formatTime(selectedSupplierDetail.created_at)}</strong>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedSupplyHistory ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <div className="row between">
                <h3>History</h3>
                <button type="button" className="ghost close-icon-btn" aria-label="Close history" onClick={() => setSelectedSupplyHistory(null)}>
                  <AppIcon name="x" />
                </button>
              </div>
              <div className="tile">
                <div>
                  <strong>
                    {isSupplier
                      ? displayName(selectedSupplyHistory.created_by_admin_name, 'Admin')
                      : selectedSupplyHistory.title}
                  </strong>
                  <p className="muted">
                    {isSupplier
                      ? 'Supply request details'
                      : displayName(selectedSupplyHistory.supplier_name, 'Supplier')}
                  </p>
                </div>
                <span className={statusClass(selectedSupplyHistory.status)}>{formatStatusText(selectedSupplyHistory.status)}</span>
              </div>

              <div className="stack">
                <h4>Timeline</h4>
                <div className="timeline-list">
                  {buildSupplyTimelineSteps(selectedSupplyHistory).map((step, index, allSteps) => (
                    <div
                      className={`timeline-item tone-${step.tone} ${step.isDone ? 'is-done' : ''} ${step.isCurrent ? 'is-current' : ''}`}
                      key={`supply-timeline-${step.status}-${index}`}
                    >
                      <div className="timeline-track">
                        <span className={`timeline-line ${index === 0 ? 'hidden' : ''} ${step.isDone ? 'active' : ''}`} />
                        <span className="timeline-dot" />
                        <span
                          className={`timeline-line ${index === allSteps.length - 1 ? 'hidden' : ''} ${
                            index < allSteps.length - 1 && step.isDone ? 'active' : ''
                          }`}
                        />
                      </div>
                      <div className="timeline-content">
                        <strong>{formatStatusText(step.status)}</strong>
                        <p className="muted">{step.timestamp ? formatTime(step.timestamp) : '--'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedSupplyHistory.expected_delivery_at ? (
                  <p className="muted small">Expected delivery: {formatTime(selectedSupplyHistory.expected_delivery_at)}</p>
                ) : null}
              </div>

              <div className="stack">
                <h4>Product History</h4>
                {selectedSupplyHistory.items.map((item) => (
                  <div className="tile" key={`${selectedSupplyHistory.supply_order_id}-${item.product_id}`}>
                    <div>
                      <strong>{item.product_name}</strong>
                      <p className="muted">Requested {item.requested_unit_value} {item.unit}</p>
                    </div>
                    <strong>{money(item.price)}</strong>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isSupplier && activePage === 'supplier-products' ? (
        <motion.section
          className="admin-grid admin-page-full"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="panel">
            <div className="products-head-row">
              <div>
                <h3>Supplier Products</h3>
                <p className="muted">Create, update, and delete your supplier catalog with role-based control.</p>
              </div>
              <div className="products-head-stats">
                <article className="products-stat">
                  <span>Total</span>
                  <strong>{supplierOwnProducts.length}</strong>
                </article>
                <article className="products-stat">
                  <span>Low Stock</span>
                  <strong>{supplierOwnProducts.filter((p) => p.inventory > 0 && p.inventory <= LOW_STOCK_THRESHOLD).length}</strong>
                </article>
                <article className="products-stat">
                  <span>Out of Stock</span>
                  <strong>{supplierOwnProducts.filter((p) => p.inventory <= 0).length}</strong>
                </article>
              </div>
            </div>

            <div className="admin-products-top-row mini-top">
              <div className="admin-products-carousel-wrap">
                <div className="low-stock-carousel-head">
                  <div>
                    <h4>Low Stock Products</h4>
                    <p className="muted small">
                      Showing {supplierLowStockCarouselProducts.length} of {supplierLowStockProducts.length}
                    </p>
                  </div>
                  <div className="row low-stock-carousel-controls">
                    <button type="button" className="ghost" onClick={() => scrollLowStockCarousel('left', 'supplier')}>◀</button>
                    <button type="button" className="ghost" onClick={() => scrollLowStockCarousel('right', 'supplier')}>▶</button>
                  </div>
                </div>
                {supplierLowStockProducts.length > 0 ? (
                  <div ref={supplierLowStockCarouselRef} className="low-stock-carousel mini-top">
                    {supplierLowStockCarouselProducts.map((p) => (
                      <article className={`admin-product-card low-stock-slide ${p.inventory <= 0 ? 'stock-out' : 'stock-low'}`} key={`supplier-low-${p.id}`}>
                        <div className="admin-product-card-head">
                          <strong>{productDisplayName(p.name)}</strong>
                          <span className={`stock-pill ${p.inventory <= 0 ? 'stock-pill-out' : 'stock-pill-low'}`}>
                            {p.inventory <= 0 ? 'Out of stock' : `Only ${p.inventory} left`}
                          </span>
                        </div>
                        <p className="muted admin-product-sub">
                          {productBrandLabel(p.brand, '') ? `${productBrandLabel(p.brand, '')} • ` : ''}
                          {productCategoryLabel(p.category)}
                          {productSubcategoryLabel(p.subcategory, '') ? ` / ${productSubcategoryLabel(p.subcategory, '')}` : ''}
                          {' • '}
                          {p.unit_value} {p.unit}
                        </p>
                        <div className="row between">
                          <strong>{money(p.price)}</strong>
                        </div>
                        <div className="row">
                          <button type="button" className="ghost" onClick={() => editSupplierProduct(p)}>Update</button>
                          <button
                            type="button"
                            className="ghost danger"
                            onClick={() => void deleteSupplierProductAction(p.id)}
                            disabled={supplierProductBusy}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="state-card mini-top">No low stock supplier products right now.</div>
                )}
              </div>
              <aside className="admin-products-action">
                <h4>Quick Action</h4>
                <p className="muted">Add and update supplier products from a popup form, matching admin flow.</p>
                <button type="button" className="primary full" onClick={openNewSupplierProductForm}>
                  New Product
                </button>
              </aside>
            </div>

            <div className="stack mini-top">
              <div className="row between">
                <h4>Your Product List</h4>
                <p className="muted small">Showing {filteredSupplierOwnProducts.length} of {supplierOwnProducts.length}</p>
              </div>
              <div className="admin-products-filters mini-top">
                <input
                  placeholder="Search by name, description, or category"
                  value={supplierProductsSearch}
                  onChange={(e) => setSupplierProductsSearch(e.target.value)}
                />
                <select
                  value={supplierProductsCategoryFilter}
                  onChange={(e) => setSupplierProductsCategoryFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {supplierCategoryOptions.map((category) => (
                    <option key={`supplier-filter-${category}`} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={supplierProductsStockFilter}
                  onChange={(e) => setSupplierProductsStockFilter(e.target.value as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock')}
                >
                  <option value="all">All Stock</option>
                  <option value="in_stock">In Stock ({'>'}{LOW_STOCK_THRESHOLD})</option>
                  <option value="low_stock">Low Stock (1-{LOW_STOCK_THRESHOLD})</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
              <div className="admin-product-cards">
                {filteredSupplierOwnProducts.map((p) => (
                  <article
                    className={`admin-product-card ${p.inventory <= 0 ? 'stock-out' : p.inventory <= LOW_STOCK_THRESHOLD ? 'stock-low' : 'stock-ok'}`}
                    key={p.id}
                  >
                    <div className="admin-product-image-wrap">
                      {p.image_url ? <img src={p.image_url} alt={productDisplayName(p.name)} className="admin-product-image" /> : <span>{productCategoryLabel(p.category)}</span>}
                    </div>
                    <div className="admin-product-card-head">
                      <strong>{productDisplayName(p.name)}</strong>
                      <span
                        className={`stock-pill ${
                          p.inventory <= 0 ? 'stock-pill-out' : p.inventory <= LOW_STOCK_THRESHOLD ? 'stock-pill-low' : 'stock-pill-ok'
                        }`}
                      >
                        {p.inventory <= 0 ? 'Out' : `Stock ${p.inventory}`}
                      </span>
                    </div>
                    <p className="muted admin-product-sub">{p.description}</p>
                    <p className="muted small">
                      {productBrandLabel(p.brand, '') ? `${productBrandLabel(p.brand, '')} • ` : ''}
                      {productCategoryLabel(p.category)}
                      {productSubcategoryLabel(p.subcategory, '') ? ` / ${productSubcategoryLabel(p.subcategory, '')}` : ''}
                      {' • '}
                      {p.unit_value} {p.unit}
                    </p>
                    <div className="row between">
                      <strong>{money(p.price)}</strong>
                    </div>
                    <div className="row">
                      <button type="button" className="ghost" onClick={() => editSupplierProduct(p)} disabled={supplierProductBusy}>
                        Update
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => void deleteSupplierProductAction(p.id)}
                        disabled={supplierProductBusy}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {filteredSupplierOwnProducts.length === 0 ? (
                <div className="state-card mini-top">No supplier products found for your search.</div>
              ) : null}
            </div>
          </div>
        </motion.section>
      ) : null}

      {isSupplier && activePage === 'supplier-orders' ? (
        <motion.section
          className="admin-grid admin-page-full"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="panel">
            <div className="products-head-row">
              <div>
                <h3>History</h3>
                <p className="muted">Track both supply request history and order history in one supplier page.</p>
              </div>
              <div className="products-head-stats">
                <article className="products-stat">
                  <span>Supply Requests</span>
                  <strong>{supplierOrders.length}</strong>
                </article>
                <article className="products-stat">
                  <span>Order History</span>
                  <strong>{history.length}</strong>
                </article>
                <article className="products-stat">
                  <span>Pending Supply</span>
                  <strong>{supplierOrders.filter((order) => order.status === 'pending').length}</strong>
                </article>
                <article className="products-stat">
                  <span>Total History</span>
                  <strong>{supplierOrders.length + history.length}</strong>
                </article>
              </div>
            </div>

            <div className="supplier-history-columns mini-top">
              <div className="admin-products-carousel-wrap stack">
                <div className="row between">
                  <h4>Supply Requests</h4>
                  <p className="muted small">Showing {supplierOrders.length} requests</p>
                </div>
                <div className="admin-product-cards">
                  {supplierOrders.map((order) => (
                    <article
                      className={`admin-product-card supply-request-card clickable-card ${
                        order.status === 'rejected'
                          ? 'stock-out'
                          : order.status === 'pending'
                            ? 'stock-low'
                            : 'stock-ok'
                      }`}
                      key={order.supply_order_id}
                      onClick={() => setSelectedSupplyHistory(order)}
                    >
                      <div className="admin-product-card-head">
                        <strong>{displayName(order.created_by_admin_name, 'Admin')}</strong>
                        <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
                      </div>
                      <p className="muted admin-product-sub">{order.notes || 'No notes'}</p>
                      <p className="muted small">Requested {formatTime(order.created_at)}</p>
                      {order.expected_delivery_at ? (
                        <p className="muted small">Expected delivery {formatTime(order.expected_delivery_at)}</p>
                      ) : null}
                      {order.status === 'pending' ? (
                        <input
                          type="datetime-local"
                          className="mini-top"
                          value={supplierExpectedDeliveryDrafts[order.supply_order_id] || defaultExpectedDeliveryLocal()}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setSupplierExpectedDeliveryDrafts((prev) => ({
                            ...prev,
                            [order.supply_order_id]: e.target.value,
                          }))}
                        />
                      ) : null}
                      {order.status === 'pending' ? (
                        <div className="row">
                          <button
                            className="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              const raw = supplierExpectedDeliveryDrafts[order.supply_order_id] || defaultExpectedDeliveryLocal();
                              const parsed = new Date(raw);
                              if (Number.isNaN(parsed.getTime())) {
                                setToast('Please choose a valid expected delivery date');
                                return;
                              }
                              void updateSupplierSupplyStatus(order.supply_order_id, 'accepted', parsed.toISOString());
                            }}
                          >
                            Accept
                          </button>
                          <button
                            className="ghost danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              void updateSupplierSupplyStatus(order.supply_order_id, 'rejected');
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
                {supplierOrders.length === 0 ? (
                  <div className="state-card mini-top">No supply requests available right now.</div>
                ) : null}
              </div>

              <div className="admin-products-carousel-wrap stack">
                <div className="row between">
                  <h4>Order History</h4>
                  <p className="muted small">Showing {history.length} orders</p>
                </div>
                <div className="admin-product-cards">
                  {history.map((order) => (
                    <article
                      className="admin-product-card clickable-card"
                      key={`supplier-history-${order.order_id}`}
                      onClick={() => void openOrder(order.order_id)}
                    >
                      <div className="admin-product-card-head">
                        <strong>{displayName(order.customer_name, session?.full_name || 'Customer')}</strong>
                        <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
                      </div>
                      <p className="muted admin-product-sub">{order.items.join(', ')}</p>
                      <p className="muted small">Placed {formatTime(order.created_at)}</p>
                      <div className="row between">
                        <strong>{money(order.total_amount)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
                {history.length === 0 ? (
                  <div className="state-card mini-top">No order history available right now.</div>
                ) : null}
              </div>
            </div>
          </div>
        </motion.section>
      ) : null}

      <AnimatePresence>
        {notificationsOpen ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>
              <div className="row between">
                <h3>Notifications</h3>
                <button type="button" className="ghost close-icon-btn" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}>
                  <AppIcon name="x" />
                </button>
              </div>
              {notificationsLoading ? <p className="muted">Loading notifications...</p> : null}
              {!notificationsLoading && notificationsError ? (
                <div className="stack">
                  <p className="error-text">{notificationsError}</p>
                  <button type="button" className="ghost" onClick={() => void openNotificationsDialog()}>
                    Retry
                  </button>
                </div>
              ) : null}
              {!notificationsLoading && !notificationsError && notice.items.length === 0 ? (
                <p className="muted">No unread notifications.</p>
              ) : null}
              {!notificationsLoading && !notificationsError && notice.items.length > 0 ? (
                <div className="stack">
                  {notice.items.map((item) => (
                    <div key={item.id} className="tile">
                      <div>
                        <strong>{item.title || 'Update'}</strong>
                        <p className="muted">{item.message || formatTime(item.created_at)}</p>
                        <p className="muted small">{formatTime(item.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="row between">
                <span className="muted small">Unread: {notice.unread_count}</span>
                <div className="row">
                  {notice.items.length > 0 ? (
                    <button type="button" className="ghost" onClick={() => void markNoticesRead()}>
                      Mark all read
                    </button>
                  ) : null}
                  <button type="button" className="ghost" onClick={() => setNotificationsOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {logoutConfirmOpen ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>
              <div className="row between">
                <h3>Confirm Logout</h3>
                <button
                  type="button"
                  className="ghost close-icon-btn"
                  aria-label="Close logout confirmation"
                  onClick={() => setLogoutConfirmOpen(false)}
                >
                  <AppIcon name="x" />
                </button>
              </div>
              <p className="muted">Are you sure you want to logout?</p>
              <div className="row">
                <button type="button" className="ghost" onClick={() => setLogoutConfirmOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="primary" onClick={logout}>
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isAdmin && settingsOpen ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <div className="row between">
                <h3>Settings</h3>
                <button type="button" className="ghost close-icon-btn" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>
                  <AppIcon name="x" />
                </button>
              </div>
              <div className="settings-tabs">
                <button
                  type="button"
                  className={`ghost ${settingsTab === 'preferences' ? 'auth-active' : ''}`}
                  onClick={() => setSettingsTab('preferences')}
                >
                  Preferences
                </button>
                <button
                  type="button"
                  className={`ghost ${settingsTab === 'shop' ? 'auth-active' : ''}`}
                  onClick={() => setSettingsTab('shop')}
                >
                  Shop
                </button>
                <button
                  type="button"
                  className={`ghost ${settingsTab === 'actions' ? 'auth-active' : ''}`}
                  onClick={() => setSettingsTab('actions')}
                >
                  Actions
                </button>
                <button
                  type="button"
                  className={`ghost ${settingsTab === 'shortcuts' ? 'auth-active' : ''}`}
                  onClick={() => setSettingsTab('shortcuts')}
                >
                  Shortcuts
                </button>
              </div>

              {settingsTab === 'preferences' ? (
                <div className="stack">
                  <div className="tile">
                    <span>Order Alerts</span>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={uiSettings.orderAlerts}
                        onChange={(e) => setUiSettings((prev) => ({ ...prev, orderAlerts: e.target.checked }))}
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="tile">
                    <span>Email Updates</span>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={uiSettings.emailUpdates}
                        onChange={(e) => setUiSettings((prev) => ({ ...prev, emailUpdates: e.target.checked }))}
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="tile">
                    <span>Compact Cards</span>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={uiSettings.compactCards}
                        onChange={(e) => setUiSettings((prev) => ({ ...prev, compactCards: e.target.checked }))}
                      />
                      Enabled
                    </label>
                  </div>
                </div>
              ) : null}

              {settingsTab === 'shop' ? (
                <div className="stack">
                  {shop ? (
                    <div className="stack">
                      <input
                        placeholder="Shop name"
                        value={shopSettingsForm.name}
                        onChange={(e) => setShopSettingsForm((prev) => ({ ...prev, name: e.target.value }))}
                        disabled={shopSettingsBusy}
                      />
                      <input
                        placeholder="Tagline"
                        value={shopSettingsForm.tagline}
                        onChange={(e) => setShopSettingsForm((prev) => ({ ...prev, tagline: e.target.value }))}
                        disabled={shopSettingsBusy}
                      />
                      <input
                        placeholder="Location"
                        value={shopSettingsForm.location}
                        onChange={(e) => setShopSettingsForm((prev) => ({ ...prev, location: e.target.value }))}
                        disabled={shopSettingsBusy}
                      />
                      <input
                        type="number"
                        min={5}
                        step={1}
                        placeholder="ETA minutes"
                        value={shopSettingsForm.eta_minutes}
                        onChange={(e) => setShopSettingsForm((prev) => ({ ...prev, eta_minutes: Number(e.target.value) }))}
                        disabled={shopSettingsBusy}
                      />
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={shopSettingsForm.is_open}
                          onChange={(e) => setShopSettingsForm((prev) => ({ ...prev, is_open: e.target.checked }))}
                          disabled={shopSettingsBusy}
                        />
                        Shop Open
                      </label>
                      <div className="tile">
                        <span>Rating / Reviews</span>
                        <strong>{shop.rating} / {shop.review_count}</strong>
                      </div>
                      <button type="button" className="primary" disabled={shopSettingsBusy} onClick={() => void saveShopSettingsFromPopup()}>
                        {shopSettingsBusy ? 'Saving...' : 'Save Shop Details'}
                      </button>
                    </div>
                  ) : (
                    <div className="tile">
                      <span className="muted">Shop details not available</span>
                    </div>
                  )}
                </div>
              ) : null}

              {settingsTab === 'actions' ? (
                <div className="stack">
                  <h4>Quick Actions</h4>
                  <div className="row">
                    <button type="button" className="ghost" onClick={() => void markNoticesRead()}>
                      Mark Notifications Read
                    </button>
                    {cartProducts.length > 0 ? (
                      <button type="button" className="ghost danger" onClick={() => setCart({})}>
                        Clear Cart
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {settingsTab === 'shortcuts' ? (
                <div className="stack">
                  <h4>Admin Shortcuts</h4>
                  <div className="row">
                    <button type="button" className="ghost" onClick={() => { setPage('home'); setSettingsOpen(false); }}>Home</button>
                    <button type="button" className="ghost" onClick={() => { setPage('admin-orders'); setSettingsOpen(false); }}>Orders</button>
                    <button type="button" className="ghost" onClick={() => { setPage('admin-products'); setSettingsOpen(false); }}>Products</button>
                    <button type="button" className="ghost" onClick={() => { setPage('admin-catalog'); setSettingsOpen(false); }}>Catalog</button>
                    <button type="button" className="ghost" onClick={() => { setPage('admin-suppliers'); setSettingsOpen(false); }}>Suppliers</button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedOrder ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog order-history-dialog" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <div className="row between">
                <h3>Order History</h3>
                <button className="ghost close-icon-btn" aria-label="Close order history" onClick={() => setSelectedOrder(null)}>
                  <AppIcon name="x" />
                </button>
              </div>
              <p className="muted">Placed at {formatTime(selectedOrder.created_at)}</p>
              <p className="muted">User: {isAdmin ? displayName(selectedOrder.customer_name, 'Customer') : displayName(session?.full_name, 'Customer')}</p>
              <div className="stack mini-top">
                <h4>Timeline</h4>
                <div className="timeline-list">
                  {buildOrderTimelineSteps(selectedOrder).map((step, index, allSteps) => (
                    <div
                      className={`timeline-item tone-${step.tone} ${step.isDone ? 'is-done' : ''} ${step.isCurrent ? 'is-current' : ''}`}
                      key={`order-timeline-${step.status}-${index}`}
                    >
                      <div className="timeline-track">
                        <span className={`timeline-line ${index === 0 ? 'hidden' : ''} ${step.isDone ? 'active' : ''}`} />
                        <span className="timeline-dot" />
                        <span
                          className={`timeline-line ${index === allSteps.length - 1 ? 'hidden' : ''} ${
                            index < allSteps.length - 1 && step.isDone ? 'active' : ''
                          }`}
                        />
                      </div>
                      <div className="timeline-content">
                        <strong>{formatStatusText(step.status)}</strong>
                        <p className="muted">{step.timestamp ? formatTime(step.timestamp) : '--'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="stack mini-top order-history-items-scroll">
                {selectedOrder.items.map((item, i) => (
                  <div className="tile" key={`${item.product_name}-${i}`}>
                    <span>{item.product_name}</span>
                    <strong>{item.quantity} x {money(item.unit_price)}</strong>
                  </div>
                ))}
              </div>
              <div className="row between mini-top">
                <span className={statusClass(selectedOrder.status)}>{formatStatusText(selectedOrder.status)}</span>
                <strong>{money(selectedOrder.total_amount)}</strong>
              </div>
              <div className="row mini-top">
                {!isAdmin && selectedOrder.status === 'out_for_delivery' ? (
                  <button className="primary" onClick={() => void confirmDelivery(selectedOrder.order_id)}>
                    Confirm Delivered
                  </button>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {authOpen ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>
              <div className="row between">
                <h3>{authMode === 'login' ? 'Sign In' : 'Register'}</h3>
                <button className="ghost close-icon-btn" aria-label="Close authentication dialog" onClick={() => setAuthOpen(false)}>
                  <AppIcon name="x" />
                </button>
              </div>
              <div className="auth-switch">
                <button className={`ghost ${authMode === 'login' ? 'auth-active' : ''}`} onClick={() => setAuthMode('login')}>User Login</button>
                <button className={`ghost ${authMode === 'register' ? 'auth-active' : ''}`} onClick={() => setAuthMode('register')}>Register</button>
              </div>
              {authMode === 'login' ? (
                <div className="stack">
                  <input
                    placeholder="Email or phone"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                  />
                  <div className="password-field-wrap">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                    >
                      <AppIcon name={showLoginPassword ? 'eyeOff' : 'eye'} />
                    </button>
                  </div>
                  <button disabled={authBusy} className="primary" onClick={() => void handleLogin()}>
                    {authBusy ? 'Signing in...' : 'Sign In'}
                  </button>
                  <div className="auth-divider">
                    <span>or</span>
                  </div>
                  <div className="google-login-wrap">
                    <div ref={googleSignInMountRef} className="google-signin-mount" />
                  </div>
                  {!import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ? (
                    <p className="muted small">Google sign-in is not configured in this environment.</p>
                  ) : null}
                  {googleAuthBusy ? <p className="muted small">Connecting Google...</p> : null}
                </div>
              ) : (
                <div className="stack">
                  <input
                    placeholder="Name"
                    value={regForm.username}
                    onChange={(e) => setRegForm((p) => ({ ...p, username: e.target.value }))}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={regForm.email}
                    onChange={(e) => setRegForm((p) => ({ ...p, email: e.target.value }))}
                  />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-country-code"
                    maxLength={COUNTRY_CODE_MAX_LENGTH}
                    placeholder="Country code"
                    value={regForm.country_code}
                    onChange={(e) => setRegForm((p) => ({ ...p, country_code: sanitizeCountryCodeInput(e.target.value) }))}
                    onBlur={(e) => {
                      if (e.target.value === '+') {
                        setRegForm((p) => ({ ...p, country_code: '+91' }));
                      }
                    }}
                  />
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={PHONE_MAX_LENGTH}
                    placeholder="Phone"
                    value={regForm.phone}
                    onChange={(e) => setRegForm((p) => ({ ...p, phone: sanitizePhoneInput(e.target.value) }))}
                  />
                  <div className="password-field-wrap">
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      placeholder="Password"
                      autoComplete="new-password"
                      value={regForm.password}
                      onChange={(e) => setRegForm((p) => ({ ...p, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowRegisterPassword((prev) => !prev)}
                    >
                      <AppIcon name={showRegisterPassword ? 'eyeOff' : 'eye'} />
                    </button>
                  </div>
                  <div className="password-field-wrap">
                    <input
                      type={showRegisterConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      aria-label={showRegisterConfirmPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowRegisterConfirmPassword((prev) => !prev)}
                    >
                      <AppIcon name={showRegisterConfirmPassword ? 'eyeOff' : 'eye'} />
                    </button>
                  </div>
                  <button disabled={authBusy} className="primary" onClick={() => void handleRegister()}>
                    {authBusy ? 'Registering...' : 'Register'}
                  </button>
                </div>
              )}
              {authError ? <p className="error-text">{authError}</p> : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {profileOpen ? (
          <>
            <motion.div
              className="panel-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileOpen(false)}
            />
            <motion.aside
              className="profile-panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              {session?.token ? (
                <>
                  <div className="row between">
                    <h3>Profile</h3>
                    <button type="button" className="ghost close-icon-btn" onClick={() => setProfileOpen(false)} aria-label="Close profile panel">
                      <AppIcon name="x" />
                    </button>
                  </div>
                  <div className="profile-panel-head">
                    <div className="avatar">{(session.full_name || session.role).slice(0, 1).toUpperCase()}</div>
                    <div>
                      <h4>{session.full_name || 'Account User'}</h4>
                      <p className="muted">{session.email || 'No email available'}</p>
                      <p className="muted">{session.phone || 'No phone available'}</p>
                    </div>
                  </div>

                  {isAdmin ? (
                    <div className="admin-drawer grow mini-top">
                      <div className="admin-drawer-content">
                        <div className="stack">
                          <button
                            className="tile admin-accordion-toggle"
                            onClick={() => setAdminDrawerSections((prev) => ({ ...prev, recent: !prev.recent }))}
                            aria-expanded={adminDrawerSections.recent}
                          >
                            <span>Last 12 hours</span>
                            <strong>{recentAdminDrawerOrders.length + recentAdminDrawerSupplyRequests.length} {adminDrawerSections.recent ? '▲' : '▼'}</strong>
                          </button>
                          <AnimatePresence>
                            {adminDrawerSections.recent ? (
                              <motion.div
                                className="stack"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.22 }}
                              >
                                {recentAdminDrawerOrders.length === 0 && recentAdminDrawerSupplyRequests.length === 0 ? (
                                  <div className="tile">
                                    <p className="muted">No orders or supply requests in the last 12 hours.</p>
                                  </div>
                                ) : null}
                                {recentAdminDrawerOrders.length > 0 ? (
                                  <p className="muted small">User Orders</p>
                                ) : null}
                                {recentAdminDrawerOrders.slice(0, 8).map((order) => (
                                  <div
                                    className="tile clickable-card"
                                    key={`admin-drawer-order-${order.order_id}`}
                                    onClick={() => void openOrder(order.order_id)}
                                  >
                                    <div>
                                      <strong>{displayName(order.customer_name, 'Customer Order')}</strong>
                                      <p className="muted small">{formatTime(order.created_at)}</p>
                                    </div>
                                    <div className="row">
                                      <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
                                    </div>
                                  </div>
                                ))}
                                {recentAdminDrawerSupplyRequests.length > 0 ? (
                                  <p className="muted small">Supply Requests</p>
                                ) : null}
                                {recentAdminDrawerSupplyRequests.slice(0, 8).map((order) => (
                                  <div
                                    className="tile clickable-card"
                                    key={`admin-drawer-supply-${order.supply_order_id}`}
                                    onClick={() => setSelectedSupplyHistory(order)}
                                  >
                                    <div>
                                      <strong>{displayName(order.supplier_name, 'Supplier')}</strong>
                                      <p className="muted small">{formatTime(order.updated_at || order.created_at)}</p>
                                    </div>
                                    <div className="row">
                                      <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  ) : isSupplier ? (
                    <div className="admin-drawer grow mini-top">
                      <div className="admin-drawer-content">
                        <div className="stack">
                          <button
                            className="tile admin-accordion-toggle"
                            onClick={() => setSupplierDrawerSections((prev) => ({ ...prev, recent: !prev.recent }))}
                            aria-expanded={supplierDrawerSections.recent}
                          >
                            <span>Last 12 hours</span>
                            <strong>{recentSupplierDrawerOrders.length + recentSupplierOrderRequests.length} {supplierDrawerSections.recent ? '▲' : '▼'}</strong>
                          </button>
                          <AnimatePresence>
                            {supplierDrawerSections.recent ? (
                              <motion.div
                                className="stack"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.22 }}
                              >
                                {recentSupplierDrawerOrders.length === 0 && recentSupplierOrderRequests.length === 0 ? (
                                  <div className="tile">
                                    <p className="muted">No supply or order requests in the last 12 hours.</p>
                                  </div>
                                ) : null}
                                {recentSupplierDrawerOrders.length > 0 ? (
                                  <p className="muted small">Supply Requests</p>
                                ) : null}
                                {recentSupplierDrawerOrders.slice(0, 8).map((order) => (
                                  <div
                                    className="tile clickable-card"
                                    key={`supplier-drawer-recent-${order.supply_order_id}`}
                                    onClick={() => setSelectedSupplyHistory(order)}
                                  >
                                    <div>
                                      <strong>{displayName(order.created_by_admin_name, 'Admin')}</strong>
                                      <p className="muted small">Qty {order.quantity} • {formatTime(order.updated_at || order.created_at)}</p>
                                    </div>
                                    <div className="row">
                                      <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
                                    </div>
                                  </div>
                                ))}
                                {recentSupplierOrderRequests.length > 0 ? (
                                  <p className="muted small">Order Requests</p>
                                ) : null}
                                {recentSupplierOrderRequests.slice(0, 8).map((order) => (
                                  <div
                                    className="tile clickable-card"
                                    key={`supplier-drawer-order-${order.order_id}`}
                                    onClick={() => void openOrder(order.order_id)}
                                  >
                                    <div>
                                      <strong>{displayName(order.customer_name, session?.full_name || 'Customer')}</strong>
                                      <p className="muted small">{formatTime(order.created_at)}</p>
                                    </div>
                                    <div className="row">
                                      <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="admin-drawer grow mini-top">
                      <div className="admin-drawer-content">
                        <div className="stack">
                          <button
                            className="tile admin-accordion-toggle"
                            onClick={() => setUserDrawerSections((prev) => ({ ...prev, recent: !prev.recent }))}
                            aria-expanded={userDrawerSections.recent}
                          >
                            <span>Last 12 hours orders</span>
                            <strong>{recentUserDrawerOrders.length} {userDrawerSections.recent ? '▲' : '▼'}</strong>
                          </button>
                          <AnimatePresence>
                            {userDrawerSections.recent ? (
                              <motion.div
                                className="stack"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.22 }}
                              >
                                {recentUserDrawerOrders.length === 0 ? (
                                  <div className="tile">
                                    <p className="muted">No orders in the last 12 hours.</p>
                                  </div>
                                ) : null}
                                {recentUserDrawerOrders.slice(0, 8).map((order) => (
                                  <div
                                    className="tile clickable-card"
                                    key={`user-drawer-order-${order.order_id}`}
                                    onClick={() => void openOrder(order.order_id)}
                                  >
                                    <div>
                                      <strong>{displayName(order.customer_name, session?.full_name || 'Customer')}</strong>
                                      <p className="muted small">{formatTime(order.created_at)}</p>
                                    </div>
                                    <div className="row">
                                      <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="profile-footer">
                    <button className="primary full" onClick={() => setLogoutConfirmOpen(true)}>Logout</button>
                  </div>
                </>
              ) : (
                <div className="state-card mini-top">
                  <p className="muted">Sign in to view your profile details.</p>
                  <button className="primary mini-top" onClick={() => { setProfileOpen(false); setAuthOpen(true); }}>
                    Sign In
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen ? (
          <motion.aside className="cart-panel" initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}>
            <div className="row between">
              <h3>Cart Summary</h3>
              <button className="ghost close-icon-btn" aria-label="Close cart panel" onClick={() => setCartOpen(false)}>
                <AppIcon name="x" />
              </button>
            </div>
            <div className="stack mini-top grow">
              {cartProducts.length === 0 ? <p className="muted">Your cart is empty</p> : null}
              {cartProducts.map(({ product, qty }) => (
                <div className="tile" key={product.id}>
                  <div>
                    <strong>{productDisplayName(product.name)}</strong>
                    <p className="muted">{money(product.price)}</p>
                  </div>
                  <div className="row">
                    <button className="ghost" onClick={() => changeQty(product.id, -1)}>-</button>
                    <span>{qty}</span>
                    <button className="ghost" onClick={() => changeQty(product.id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-footer">
              <div className="row between">
                <span>Total</span>
                <strong>{money(cartTotal)}</strong>
              </div>
              <button className="primary full" onClick={() => void handleCheckout()}>
                Checkout
              </button>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div className="toast" initial={{ y: 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <span>{toast}</span>
            <button type="button" className="ghost close-icon-btn toast-close-btn" aria-label="Close alert" onClick={() => setToast('')}>
              <AppIcon name="x" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isAdmin ? (
        <nav className="admin-bottom-nav" aria-label="Admin Bottom Navigation">
          <button
            className={`admin-nav-btn ${activePage === 'home' ? 'admin-nav-active' : ''}`}
            onClick={() => setPage('home')}
          >
            <span><AppIcon name="home" /></span>
            <small>Home</small>
          </button>
          <button
            className={`admin-nav-btn ${activePage === 'admin-orders' ? 'admin-nav-active' : ''}`}
            onClick={() => setPage('admin-orders')}
          >
            <span><AppIcon name="receipt" /></span>
            <small>Orders</small>
          </button>
          <button
            className={`admin-nav-btn ${activePage === 'admin-products' ? 'admin-nav-active' : ''}`}
            onClick={() => setPage('admin-products')}
          >
            <span><AppIcon name="package" /></span>
            <small>Products</small>
          </button>
          <button
            className={`admin-nav-btn ${activePage === 'admin-suppliers' ? 'admin-nav-active' : ''}`}
            onClick={() => setPage('admin-suppliers')}
          >
            <span><AppIcon name="factory" /></span>
            <small>Suppliers</small>
          </button>
        </nav>
      ) : isSupplier ? (
        <nav className="admin-bottom-nav" aria-label="Supplier Bottom Navigation">
          <button
            className={`admin-nav-btn ${activePage === 'home' ? 'admin-nav-active' : ''}`}
            onClick={() => setPage('home')}
          >
            <span><AppIcon name="home" /></span>
            <small>Home</small>
          </button>
          <button
            className={`admin-nav-btn ${activePage === 'supplier-products' ? 'admin-nav-active' : ''}`}
            onClick={() => setPage('supplier-products')}
          >
            <span><AppIcon name="package" /></span>
            <small>Products</small>
          </button>
          <button
            className={`admin-nav-btn ${activePage === 'supplier-orders' ? 'admin-nav-active' : ''}`}
            onClick={() => setPage('supplier-orders')}
          >
            <span><AppIcon name="history" /></span>
            <small>History</small>
          </button>
        </nav>
      ) : isUser ? (
        <nav className="admin-bottom-nav" aria-label="User Bottom Navigation">
          <button
            className={`admin-nav-btn ${activePage === 'home' ? 'admin-nav-active' : ''}`}
            onClick={() => setPage('home')}
          >
            <span><AppIcon name="home" /></span>
            <small>Home</small>
          </button>
          <button
            className={`admin-nav-btn ${activePage === 'user-orders' ? 'admin-nav-active' : ''}`}
            onClick={() => setPage('user-orders')}
          >
            <span><AppIcon name="receipt" /></span>
            <small>Orders</small>
          </button>
        </nav>
      ) : null}
    </div>
  );
}

export default App;
