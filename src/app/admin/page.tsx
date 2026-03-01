import { getCustomers } from '@/actions/users';
import { getProducts } from '@/actions/products';
import { getOrders, getOverlaps } from '@/actions/orders';
import { Users, Package, ShoppingCart, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function AdminDashboard() {
    const [customers, products, orders, overlaps] = await Promise.all([
        getCustomers(),
        getProducts(),
        getOrders(),
        getOverlaps(),
    ]);

    const activeCustomers = customers.filter((c: any) => c.active_status).length;
    const activeProducts = products.filter((p: any) => p.active_status).length;
    const todayOrders = orders.filter(
        (o: any) => format(new Date(o.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length;
    const recentOrders = orders.slice(0, 8);

    const stats = [
        {
            label: 'Active Customers', value: activeCustomers, total: customers.length,
            icon: <Users size={22} className="text-white" />,
            gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            href: '/admin/customers',
        },
        {
            label: 'Active Products', value: activeProducts, total: products.length,
            icon: <Package size={22} className="text-white" />,
            gradient: 'linear-gradient(135deg, #10b981, #059669)',
            href: '/admin/products',
        },
        {
            label: 'Total Orders', value: orders.length, total: null,
            icon: <ShoppingCart size={22} className="text-white" />,
            gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            href: '/admin/orders',
        },
        {
            label: 'Overlaps', value: overlaps.length, total: null,
            icon: <AlertTriangle size={22} className="text-white" />,
            gradient: overlaps.length > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #6b7280, #4b5563)',
            href: '/admin/orders',
        },
    ];

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-muted mt-1">Overview of your bakery order management system</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {stats.map((stat) => (
                    <Link key={stat.label} href={stat.href} className="stat-card cursor-pointer">
                        <div className="stat-icon" style={{ background: stat.gradient }}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-sm text-muted font-medium">{stat.label}</p>
                            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                            {stat.total !== null && (
                                <p className="text-xs text-muted">of {stat.total} total</p>
                            )}
                        </div>
                    </Link>
                ))}
            </div>

            {/* Overlaps Warning */}
            {overlaps.length > 0 && (
                <div className="card mb-6 border-danger/30 animate-fade-in">
                    <div className="p-4 flex items-center gap-3" style={{ background: '#fef2f2' }}>
                        <AlertTriangle size={20} className="text-danger flex-shrink-0" />
                        <div>
                            <p className="font-bold text-danger text-sm">
                                {overlaps.length} Order Overlap{overlaps.length > 1 ? 's' : ''} Detected
                            </p>
                            <p className="text-xs text-red-700">
                                Weekly and daily orders overlap for the same customer, product, and date. Review in the Orders section.
                            </p>
                        </div>
                        <Link href="/admin/orders" className="btn btn-danger btn-sm ml-auto">
                            Review
                        </Link>
                    </div>
                </div>
            )}

            {/* Recent Orders */}
            <div className="card">
                <div className="p-5 border-b border-border flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Clock size={18} className="text-primary" />
                        Recent Orders
                    </h2>
                    <Link href="/admin/orders" className="btn btn-ghost btn-sm">View All →</Link>
                </div>
                {recentOrders.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map((order: any) => (
                                <tr key={order.id}>
                                    <td className="font-medium">{(order.customer as any)?.name || 'Unknown'}</td>
                                    <td>
                                        <span className={`badge ${order.order_type === 'weekly' ? 'badge-info' : 'badge-success'}`}>
                                            {order.order_type}
                                        </span>
                                    </td>
                                    <td>
                                        {order.order_type === 'weekly'
                                            ? `Week of ${order.week_start_date}`
                                            : order.delivery_date}
                                    </td>
                                    <td>{order.order_items?.length || 0}</td>
                                    <td className="text-muted text-sm">
                                        {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-muted">No orders yet.</div>
                )}
            </div>
        </div>
    );
}
