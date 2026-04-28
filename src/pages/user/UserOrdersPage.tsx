import { motion } from 'framer-motion';
import type { OrderHistoryItem, Product } from '../../types';
import {
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

type UserOrdersPageProps = {
  history: OrderHistoryItem[];
  sessionFullName?: string;
  orderPreviewById: Map<string, OrderPreview>;
  onOpenOrder: (orderId: string) => void | Promise<void>;
};

export function UserOrdersPage({
  history,
  sessionFullName,
  orderPreviewById,
  onOpenOrder,
}: UserOrdersPageProps) {
  return (
    <motion.section
      className="panel"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3>Your Orders</h3>
      <div className="admin-product-cards mini-top orders-grid-two">
        {history.map((order) => {
          const preview = orderPreviewById.get(order.order_id);
          const mockImage = '/app_logo.jpeg';
          return (
            <article className="admin-product-card clickable-card" key={order.order_id} onClick={() => void onOpenOrder(order.order_id)}>
              <div className="admin-product-card-head">
                <strong>{displayName(order.customer_name, sessionFullName || 'Customer')}</strong>
                <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
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
              <div className="live-order-footer row between">
                <p className="muted small">Placed {formatTime(order.created_at)}</p>
                <button
                  type="button"
                  className="ghost live-order-open-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    void onOpenOrder(order.order_id);
                  }}
                >
                  View Order
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </motion.section>
  );
}
