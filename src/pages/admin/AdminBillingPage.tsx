import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, getApiError } from '../../api';
import { AppIcon } from '../../components/common/AppIcon';
import type { PosSaleDetail, PosSaleSummary, Product } from '../../types';
import { displayName, formatTime, money } from '../../utils/presentation';

type BillingCartItem = {
  product: Product;
  quantity: number;
  discount_amount: number;
};

type AdminBillingPageProps = {
  token: string;
  products: Product[];
  sales: PosSaleSummary[];
  selectedSale: PosSaleDetail | null;
  onSaleCreated: (sale: PosSaleDetail) => Promise<void> | void;
  onOpenSale: (saleId: string) => Promise<void> | void;
  onCloseSale: () => void;
  onToast: (message: string) => void;
};

const PAYMENT_OPTIONS = ['cash', 'card', 'upi', 'split', 'credit'];

export function AdminBillingPage({
  token,
  products,
  sales,
  selectedSale,
  onSaleCreated,
  onOpenSale,
  onCloseSale,
  onToast,
}: AdminBillingPageProps) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<BillingCartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [saleDiscountAmount, setSaleDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [saleBusy, setSaleBusy] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return products.filter((product) => product.inventory > 0).slice(0, 16);
    return products
      .filter((product) => {
        const haystack = [
          product.name,
          product.category,
          product.brand || '',
          product.subcategory || '',
          product.barcode || '',
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 16);
  }, [products, deferredSearch]);

  const cartSummary = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const lineDiscount = cart.reduce((sum, item) => sum + item.discount_amount, 0);
    const taxableBase = Math.max(0, subtotal - lineDiscount - saleDiscountAmount);
    const taxAmount = cart.reduce((sum, item) => {
      const itemBase = Math.max(0, item.product.price * item.quantity - item.discount_amount);
      const taxPercent = Number(item.product.tax_percent || 0);
      return sum + (itemBase * taxPercent) / 100;
    }, 0);
    const total = Math.max(0, taxableBase + taxAmount);
    return {
      subtotal,
      discount: lineDiscount + saleDiscountAmount,
      tax: taxAmount,
      total,
    };
  }, [cart, saleDiscountAmount]);

  useEffect(() => {
    setAmountPaid((current) => (current <= 0 ? Number(cartSummary.total.toFixed(2)) : current));
  }, [cartSummary.total]);

  function addProductToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1, discount_amount: 0 }];
    });
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  }

  async function handleBarcodeLookup() {
    const barcode = barcodeInput.trim();
    if (!barcode) {
      onToast('Enter or scan a barcode');
      return;
    }
    setLookupBusy(true);
    try {
      const product = await api.lookupAdminPosProduct(token, barcode);
      addProductToCart(product);
      onToast(`Added ${product.name}`);
    } catch (error) {
      onToast(getApiError(error));
    } finally {
      setLookupBusy(false);
    }
  }

  function updateCartQuantity(productId: string, nextQuantity: number) {
    if (nextQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: nextQuantity } : item,
      ),
    );
  }

  function updateCartDiscount(productId: string, nextDiscount: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, discount_amount: Math.max(0, Number.isFinite(nextDiscount) ? nextDiscount : 0) }
          : item,
      ),
    );
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      onToast('Add products before completing billing');
      return;
    }
    setSaleBusy(true);
    try {
      const sale = await api.createAdminPosSale(token, {
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim(),
        payment_mode: paymentMode,
        amount_paid: Number.isFinite(amountPaid) ? amountPaid : 0,
        sale_discount_amount: Number.isFinite(saleDiscountAmount) ? saleDiscountAmount : 0,
        notes: notes.trim(),
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          discount_amount: item.discount_amount,
        })),
      });
      setCart([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setPaymentMode('cash');
      setAmountPaid(0);
      setSaleDiscountAmount(0);
      setNotes('');
      await onSaleCreated(sale);
      onToast(`Sale completed: ${sale.invoice_number}`);
      barcodeInputRef.current?.focus();
    } catch (error) {
      onToast(getApiError(error));
    } finally {
      setSaleBusy(false);
    }
  }

  return (
    <motion.section
      className="admin-grid admin-page-full"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55 }}
    >
      <div className="panel">
        <div className="products-head-row">
          <div>
            <h3>Billing Counter</h3>
            <p className="muted">Scan barcodes, build the bill, accept payment, and save shop-counter sales.</p>
          </div>
          <div className="products-head-stats">
            <article className="products-stat">
              <span>Products</span>
              <strong>{products.length}</strong>
            </article>
            <article className="products-stat">
              <span>Open Cart</span>
              <strong>{cart.length}</strong>
            </article>
            <article className="products-stat">
              <span>Recent Bills</span>
              <strong>{sales.length}</strong>
            </article>
          </div>
        </div>

        <div className="admin-products-top-row billing-layout mini-top">
          <div className="admin-products-carousel-wrap billing-catalog-panel stack">
            <div className="billing-scan-row">
              <input
                ref={barcodeInputRef}
                placeholder="Scan barcode and press Enter"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleBarcodeLookup();
                  }
                }}
              />
              <button type="button" className="primary" disabled={lookupBusy} onClick={() => void handleBarcodeLookup()}>
                {lookupBusy ? 'Scanning...' : 'Scan'}
              </button>
            </div>

            <div className="admin-products-filters mini-top">
              <input
                placeholder="Search name, category, brand, or barcode"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="admin-product-cards billing-history-grid">
              {filteredProducts.map((product) => (
                <article className="admin-product-card clickable-card" key={`billing-search-${product.id}`} onClick={() => addProductToCart(product)}>
                  <div className="admin-product-card-head">
                    <strong>{product.name}</strong>
                    <span className={product.inventory <= 0 ? 'stock-pill stock-pill-out' : 'stock-pill stock-pill-ok'}>
                      Stock {product.inventory}
                    </span>
                  </div>
                  <p className="muted admin-product-sub">
                    {product.category} {product.barcode ? `• ${product.barcode}` : ''}
                  </p>
                  <div className="row between">
                    <strong>{money(product.price)}</strong>
                    <button type="button" className="ghost" onClick={(e) => { e.stopPropagation(); addProductToCart(product); }}>
                      Add
                    </button>
                  </div>
                </article>
              ))}
              {filteredProducts.length === 0 ? (
                <div className="state-card mini-top">No matching products found.</div>
              ) : null}
            </div>
          </div>

          <aside className="admin-products-action billing-checkout-panel stack">
            <h4>Current Bill</h4>
            <div className="stack billing-customer-fields">
              <input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <input placeholder="Customer phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                {PAYMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="stack billing-cart-list">
              {cart.map((item) => (
                <div className="tile billing-cart-item" key={`billing-cart-${item.product.id}`}>
                  <div className="row between">
                    <strong>{item.product.name}</strong>
                    <button type="button" className="ghost" onClick={() => updateCartQuantity(item.product.id, 0)}>Remove</button>
                  </div>
                  <p className="muted small">{item.product.barcode || item.product.category}</p>
                  <div className="billing-cart-controls">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={item.quantity}
                      onChange={(e) => updateCartQuantity(item.product.id, Number(e.target.value))}
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.discount_amount}
                      onChange={(e) => updateCartDiscount(item.product.id, Number(e.target.value))}
                      placeholder="Line discount"
                    />
                  </div>
                  <div className="row between">
                    <span>{money(item.product.price)} x {item.quantity}</span>
                    <strong>{money(item.product.price * item.quantity - item.discount_amount)}</strong>
                  </div>
                </div>
              ))}
              {cart.length === 0 ? (
                <div className="state-card">Cart is empty. Scan or add products to begin billing.</div>
              ) : null}
            </div>

            <div className="stack">
              <input
                type="number"
                min={0}
                step={0.01}
                value={saleDiscountAmount}
                onChange={(e) => setSaleDiscountAmount(Number(e.target.value))}
                placeholder="Bill discount"
              />
              <input
                type="number"
                min={0}
                step={0.01}
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                placeholder="Amount paid"
              />
              <textarea
                className="billing-notes"
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <div className="tile billing-summary-card">
                <div className="row between"><span>Subtotal</span><strong>{money(cartSummary.subtotal)}</strong></div>
                <div className="row between"><span>Discount</span><strong>{money(cartSummary.discount)}</strong></div>
                <div className="row between"><span>Tax</span><strong>{money(cartSummary.tax)}</strong></div>
                <div className="row between"><span>Total</span><strong>{money(cartSummary.total)}</strong></div>
              </div>
              <button type="button" className="primary full" disabled={saleBusy} onClick={() => void handleCheckout()}>
                {saleBusy ? 'Completing Sale...' : 'Complete Billing'}
              </button>
            </div>
          </aside>
        </div>

        <div className="mini-top">
          <div className="row between">
            <h4>Recent Bills</h4>
            <p className="muted small">Tap a bill to open receipt details.</p>
          </div>
          <div className="admin-product-cards billing-history-grid">
            {sales.map((sale) => (
              <article className="admin-product-card clickable-card" key={sale.sale_id} onClick={() => void onOpenSale(sale.sale_id)}>
                <div className="admin-product-card-head">
                  <strong>{sale.invoice_number}</strong>
                  <button
                    type="button"
                    className="ghost history-icon-btn"
                    aria-label="Open bill receipt"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onOpenSale(sale.sale_id);
                    }}
                  >
                    <AppIcon name="history" />
                  </button>
                </div>
                <p className="muted admin-product-sub">{displayName(sale.customer_name, 'Walk-in Customer')}</p>
                <div className="row between">
                  <span>{sale.payment_mode.toUpperCase()}</span>
                  <strong>{money(sale.total_amount)}</strong>
                </div>
                <p className="muted small">{sale.item_count} items • {formatTime(sale.created_at)}</p>
              </article>
            ))}
            {sales.length === 0 ? (
              <div className="state-card mini-top">No billing records yet.</div>
            ) : null}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedSale ? (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dialog" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <div className="row between">
                <div>
                  <h3>{selectedSale.invoice_number}</h3>
                  <p className="muted">{formatTime(selectedSale.created_at)} • {selectedSale.payment_mode.toUpperCase()}</p>
                </div>
                <button type="button" className="ghost close-icon-btn" aria-label="Close bill detail" onClick={onCloseSale}>
                  <AppIcon name="x" />
                </button>
              </div>
              <div className="stack mini-top">
                <div className="tile">
                  <p className="muted">Customer: {displayName(selectedSale.customer_name, 'Walk-in Customer')}</p>
                  <p className="muted">Phone: {selectedSale.customer_phone || 'Not provided'}</p>
                  <p className="muted">Cashier: {selectedSale.cashier_name}</p>
                </div>
                <div className="stack">
                  {selectedSale.items.map((item) => (
                    <div className="tile" key={item.id}>
                      <div className="row between">
                        <strong>{item.product_name}</strong>
                        <strong>{money(item.line_total)}</strong>
                      </div>
                      <p className="muted small">
                        {item.quantity} x {money(item.unit_price)} • Tax {item.tax_percent}% {item.barcode ? `• ${item.barcode}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="tile">
                  <div className="row between"><span>Subtotal</span><strong>{money(selectedSale.subtotal)}</strong></div>
                  <div className="row between"><span>Discount</span><strong>{money(selectedSale.discount_amount)}</strong></div>
                  <div className="row between"><span>Tax</span><strong>{money(selectedSale.tax_amount)}</strong></div>
                  <div className="row between"><span>Total</span><strong>{money(selectedSale.total_amount)}</strong></div>
                  <div className="row between"><span>Paid</span><strong>{money(selectedSale.amount_paid)}</strong></div>
                  <div className="row between"><span>Change</span><strong>{money(selectedSale.change_amount)}</strong></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
