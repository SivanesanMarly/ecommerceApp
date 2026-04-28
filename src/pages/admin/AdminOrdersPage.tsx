import { motion } from 'framer-motion';
import { AppIcon } from '../../components/common/AppIcon';
import type { OrderHistoryItem, Product } from '../../types';
import {
  allowedAdminOrderTransitions,
  displayName,
  formatStatusText,
  formatTime,
  money,
  statusClass,
} from '../../utils/presentation';

const ORDER_ITEM_QTY_SUFFIX = /\s+x\s+\d+\s*$/i;

function parseOrderItemForTable(item: string) {
  const raw = item.trim();
  const qtyMatch = raw.match(/x\s+(\d+)\s*$/i);
  const quantity = qtyMatch ? Number(qtyMatch[1]) : null;
  const name = raw.replace(ORDER_ITEM_QTY_SUFFIX, '').trim() || raw;
  return { name, quantity };
}

type OrderPreview = {
  previewProducts: Product[];
  hiddenPreviewCount: number;
};

type AdminOrdersPageProps = {
  adminOrders: OrderHistoryItem[];
  runningAdminOrders: OrderHistoryItem[];
  deliveredAdminOrders: number;
  filteredAdminOrders: OrderHistoryItem[];
  adminOrdersSearch: string;
  adminOrdersStatusFilter: string;
  adminOrderStatusOptions: string[];
  adminOrderStatusUpdatingId: string | null;
  setAdminOrdersSearch: (value: string) => void;
  setAdminOrdersStatusFilter: (value: string) => void;
  orderPreviewById: Map<string, OrderPreview>;
  onOpenOrder: (orderId: string) => void | Promise<void>;
  onUpdateAdminOrder: (orderId: string, status: string) => void | Promise<void>;
};

export function AdminOrdersPage({
  adminOrders,
  runningAdminOrders,
  deliveredAdminOrders,
  filteredAdminOrders,
  adminOrdersSearch,
  adminOrdersStatusFilter,
  adminOrderStatusOptions,
  adminOrderStatusUpdatingId,
  setAdminOrdersSearch,
  setAdminOrdersStatusFilter,
  orderPreviewById,
  onOpenOrder,
  onUpdateAdminOrder,
}: AdminOrdersPageProps) {
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
            <h3>Orders</h3>
            <p className="muted">Track all customer orders and update status quickly from one page.</p>
          </div>
          <div className="products-head-stats">
            <article className="products-stat">
              <span>Total</span>
              <strong>{adminOrders.length}</strong>
            </article>
            <article className="products-stat">
              <span>Running</span>
              <strong>{runningAdminOrders.length}</strong>
            </article>
            <article className="products-stat">
              <span>Delivered</span>
              <strong>{deliveredAdminOrders}</strong>
            </article>
          </div>
        </div>

        <div className="mini-top">
          <div className="row between">
            <h4>All Orders</h4>
            <p className="muted small">Showing {filteredAdminOrders.length} of {adminOrders.length}</p>
          </div>
          <div className="admin-products-filters mini-top">
            <input
              placeholder="Search by order id, status, item, or address"
              value={adminOrdersSearch}
              onChange={(e) => setAdminOrdersSearch(e.target.value)}
            />
            <select
              value={adminOrdersStatusFilter}
              onChange={(e) => setAdminOrdersStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="running">Running</option>
              {adminOrderStatusOptions.map((status) => (
                <option key={`admin-order-filter-${status}`} value={status}>
                  {formatStatusText(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-product-cards orders-grid-two">
            {filteredAdminOrders.map((order) => {
              const allowedTransitions = allowedAdminOrderTransitions(order.status);
              const selectableStatuses = [order.status, ...allowedTransitions];
              const isLocked = allowedTransitions.length === 0;
              const isUpdating = adminOrderStatusUpdatingId === order.order_id;
              const preview = orderPreviewById.get(order.order_id);
              const mockImage = '/app_logo.jpeg';
              return (
                <article
                  className="admin-product-card clickable-card"
                  key={order.order_id}
                  onClick={() => void onOpenOrder(order.order_id)}
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
                          void onOpenOrder(order.order_id);
                        }}
                      >
                        <AppIcon name="history" />
                      </button>
                    </div>
                  </div>
                  <div className="live-order-split">
                    <div className="live-order-media">
                      {preview && preview.previewProducts.length === 1 ? (
                        <div className="live-order-single-image">
                          <img
                            src={(preview.previewProducts[0].image_url || '').trim() || mockImage}
                            alt={preview.previewProducts[0].name}
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                      {preview && preview.previewProducts.length > 1 ? (
                        <div className="live-order-flipbook">
                          {preview.previewProducts.map((product, index) => (
                            <figure
                              className="live-order-page"
                              key={`${order.order_id}-${product.id}`}
                              style={{
                                animationDelay: `${index * 2.2}s`,
                                animationDuration: `${Math.max(6, preview.previewProducts.length * 2.2)}s`,
                                zIndex: preview.previewProducts.length - index,
                              }}
                            >
                              <img src={(product.image_url || '').trim() || mockImage} alt={product.name} loading="lazy" />
                            </figure>
                          ))}
                          {preview.hiddenPreviewCount > 0 ? (
                            <span className="live-order-thumb-more live-order-thumb-more-overlay">+{preview.hiddenPreviewCount}</span>
                          ) : null}
                        </div>
                      ) : null}
                      {!preview || preview.previewProducts.length === 0 ? (
                        <div className="live-order-single-image">
                          <img src={mockImage} alt="Sample product" loading="lazy" />
                        </div>
                      ) : null}
                    </div>
                    <div className="live-order-details">
                      <div className="live-order-items-table" aria-label="Order contents">
                        {order.items.map((item, index) => {
                          const parsedItem = parseOrderItemForTable(item);
                          return (
                            <div className="live-order-items-row" key={`${order.order_id}-item-${index}`}>
                              <span className="live-order-items-name">{parsedItem.name}</span>
                              <span className="live-order-items-qty">x{parsedItem.quantity ?? 1}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="row between">
                        <strong>{money(order.total_amount)}</strong>
                      </div>
                    </div>
                  </div>
                  <p className="muted small">
                    Address: {order.customer_address?.trim() ? order.customer_address : 'Not available'}
                  </p>
                  <div className="row between">
                    <select
                      value={order.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => void onUpdateAdminOrder(order.order_id, e.target.value)}
                      disabled={isLocked || isUpdating}
                    >
                      {selectableStatuses.map((status) => (
                        <option key={`${order.order_id}-${status}`} value={status}>
                          {formatStatusText(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="live-order-footer row between">
                    <p className="muted small">Placed {formatTime(order.created_at)}</p>
                    <span className="muted small">
                      {isUpdating ? 'Updating status...' : isLocked ? 'No status actions' : 'Status enabled'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
          {filteredAdminOrders.length === 0 ? (
            <div className="state-card mini-top">No orders found for current filters.</div>
          ) : null}
        </div>
      </div>
    </motion.section>
  );
}
