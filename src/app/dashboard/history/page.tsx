import { getMyOrders } from '@/actions/orders';
import { History, CalendarDays, CalendarPlus, Package } from 'lucide-react';
import { format } from 'date-fns';

export default async function OrderHistoryPage() {
    const orders = await getMyOrders();

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <History size={24} className="text-primary" />
                    Order History
                </h1>
                <p className="text-muted text-sm mt-1">All your submitted orders</p>
            </div>

            {orders.length > 0 ? (
                <div className="space-y-4">
                    {orders.map((order: any) => (
                        <div key={order.id} className="card animate-fade-in">
                            <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    {order.order_type === 'weekly' ? (
                                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', width: '40px', height: '40px' }}>
                                            <CalendarDays size={18} className="text-white" />
                                        </div>
                                    ) : (
                                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', width: '40px', height: '40px' }}>
                                            <CalendarPlus size={18} className="text-white" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-foreground">
                                            {order.order_type === 'weekly' ? 'Weekly Order' : 'Daily Order'}
                                        </h3>
                                        <p className="text-sm text-muted">
                                            {order.order_type === 'weekly'
                                                ? `Week of ${order.week_start_date}`
                                                : `Delivery: ${order.delivery_date}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`badge ${order.order_type === 'weekly' ? 'badge-info' : 'badge-success'}`}>
                                        {order.order_type}
                                    </span>
                                    <span className="text-xs text-muted">
                                        Submitted: {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                                    </span>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="p-4">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Delivery Date</th>
                                            <th className="text-center">Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.order_items?.map((item: any) => (
                                            <tr key={item.id}>
                                                <td className="font-medium">{item.product?.name || 'Unknown'}</td>
                                                <td className="text-muted">{item.delivery_date}</td>
                                                <td className="text-center font-bold text-primary">{item.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-3 text-right text-sm text-muted">
                                    <Package size={14} className="inline mr-1" />
                                    {order.order_items?.length || 0} product entries ·
                                    Total: <strong className="text-primary">
                                        {order.order_items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0}
                                    </strong> items
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card p-12 text-center">
                    <History size={48} className="mx-auto mb-3 text-muted opacity-30" />
                    <h3 className="text-lg font-bold text-foreground">No orders yet</h3>
                    <p className="text-muted text-sm mt-1">Your order history will appear here after you submit orders.</p>
                </div>
            )}
        </div>
    );
}
