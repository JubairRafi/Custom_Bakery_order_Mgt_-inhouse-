import { getCurrentUser } from '@/actions/auth';
import { getMyOrders } from '@/actions/orders';
import { CalendarDays, CalendarPlus, History, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function CustomerDashboard() {
    const user = await getCurrentUser();
    const { data: recentOrders, count: totalOrders } = await getMyOrders(1, 5);

    return (
        <div className="animate-fade-in">
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground">
                    Welcome back, <span className="text-primary">{user?.name}</span>
                </h1>
                <p className="text-muted mt-1">Submit your weekly and daily orders below.</p>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <Link href="/dashboard/weekly-order" className="card p-6 group cursor-pointer hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                            <CalendarDays size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-muted font-medium">Submit</p>
                            <p className="text-lg font-bold text-foreground">Weekly Order</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted mt-3">7-day product quantities for the upcoming week</p>
                </Link>

                <Link href="/dashboard/daily-order" className="card p-6 group cursor-pointer hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <CalendarPlus size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-muted font-medium">Submit</p>
                            <p className="text-lg font-bold text-foreground">Daily Order</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted mt-3">Single-day order for a specific delivery date</p>
                </Link>

                <Link href="/dashboard/history" className="card p-6 group cursor-pointer hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                            <History size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-muted font-medium">View</p>
                            <p className="text-lg font-bold text-foreground">Order History</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted mt-3">
                        {totalOrders} total orders
                    </p>
                </Link>
            </div>

            {/* Recent Orders */}
            <div className="card">
                <div className="p-5 border-b border-border">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Clock size={18} className="text-primary" />
                        Recent Orders
                    </h2>
                </div>
                {recentOrders.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Submitted</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map((order: any) => (
                                <tr key={order.id}>
                                    <td>
                                        <span className={`badge ${order.order_type === 'weekly' ? 'badge-info' : 'badge-success'}`}>
                                            {order.order_type}
                                        </span>
                                    </td>
                                    <td className="font-medium">
                                        {order.order_type === 'weekly'
                                            ? `Week of ${order.week_start_date}`
                                            : order.delivery_date}
                                    </td>
                                    <td>{order.order_items?.length || 0} items</td>
                                    <td className="text-muted text-sm">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <span className="badge badge-success">Submitted</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center text-muted">
                        <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No orders yet</p>
                        <p className="text-sm">Start by submitting a weekly or daily order.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
