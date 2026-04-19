import { motion } from 'framer-motion';
import type { OrderHistoryItem } from '../../types';
import {
  displayName,
  formatStatusText,
  formatTime,
  money,
  statusClass,
} from '../../utils/presentation';

type UserOrdersPageProps = {
  history: OrderHistoryItem[];
  sessionFullName?: string;
  onOpenOrder: (orderId: string) => void | Promise<void>;
};

export function UserOrdersPage({
  history,
  sessionFullName,
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
      <div className="stack">
        {history.map((order) => (
          <div className="tile" key={order.order_id}>
            <div>
              <h4>{displayName(order.customer_name, sessionFullName || 'Customer')}</h4>
              <p className="muted">{formatTime(order.created_at)}</p>
            </div>
            <div className="row">
              <span className={statusClass(order.status)}>{formatStatusText(order.status)}</span>
              <strong>{money(order.total_amount)}</strong>
              <button className="ghost" onClick={() => void onOpenOrder(order.order_id)}>
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
