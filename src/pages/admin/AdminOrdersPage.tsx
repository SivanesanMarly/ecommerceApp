import { motion } from 'framer-motion';
import { AppIcon } from '../../components/common/AppIcon';
import type { OrderHistoryItem } from '../../types';
import {
  allowedAdminOrderTransitions,
  displayName,
  formatStatusText,
  formatTime,
  money,
  statusClass,
} from '../../utils/presentation';

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
              placeholder="Search by order id, status, or item"
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
          <div className="admin-product-cards">
            {filteredAdminOrders.map((order) => {
              const allowedTransitions = allowedAdminOrderTransitions(order.status);
              const selectableStatuses = [order.status, ...allowedTransitions];
              const isLocked = allowedTransitions.length === 0;
              const isUpdating = adminOrderStatusUpdatingId === order.order_id;
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
                  <p className="muted small">Placed {formatTime(order.created_at)}</p>
                  <p className="muted admin-product-sub">{order.items.join(', ')}</p>
                  <div className="row between">
                    <strong>{money(order.total_amount)}</strong>
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
                  <div className="row between">
                    <span className="muted small">
                      {isUpdating ? 'Updating status...' : isLocked ? '' : 'Status enabled'}
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
