'use client';

import { useState, useEffect } from 'react';
import { getOrders, getOverlaps, deleteOrder, resolveOverlap } from '@/actions/orders';
import { getCustomers } from '@/actions/users';
import { ShoppingCart, AlertTriangle, Trash2, Eye, Loader2, Search, Filter, X, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [overlaps, setOverlaps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showOverlapsOnly, setShowOverlapsOnly] = useState(false);
    const [resolvingKey, setResolvingKey] = useState<string | null>(null);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const [ords, custs, ovs] = await Promise.all([
            getOrders(),
            getCustomers(),
            getOverlaps(),
        ]);
        setOrders(ords);
        setCustomers(custs);
        setOverlaps(ovs);
        setLoading(false);
    }

    async function handleDelete(orderId: string) {
        if (!confirm('Are you sure you want to delete this order? This cannot be undone.')) return;
        await deleteOrder(orderId);
        loadData();
    }

    async function handleResolve(ov: any, keep: 'weekly' | 'daily') {
        const removeLabel = keep === 'weekly' ? 'daily' : 'weekly';
        if (!confirm(`Keep ${keep} order and remove ${removeLabel} order for ${ov.product_name} on ${ov.delivery_date}?`)) return;
        const key = `${ov.customer_id}-${ov.product_id}-${ov.delivery_date}`;
        setResolvingKey(key);
        await resolveOverlap(ov.customer_id, ov.product_id, ov.delivery_date, keep);
        setResolvingKey(null);
        loadData();
    }

    function isOverlapping(order: any): boolean {
        if (!order.order_items) return false;
        return order.order_items.some((item: any) =>
            overlaps.some(
                (o: any) =>
                    o.customer_id === order.customer_id &&
                    o.product_id === item.product_id &&
                    o.delivery_date === item.delivery_date
            )
        );
    }

    const filteredOrders = orders.filter((o) => {
        if (filterCustomer && o.customer_id !== filterCustomer) return false;
        if (filterType && o.order_type !== filterType) return false;
        if (showOverlapsOnly && !isOverlapping(o)) return false;
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-primary" size={36} />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <ShoppingCart size={24} className="text-primary" />
                        Order Management
                    </h1>
                    <p className="text-muted text-sm mt-1">{orders.length} total orders</p>
                </div>
            </div>

            {/* Overlap Alert */}
            {overlaps.length > 0 && (
                <div className="card mb-6 border-danger/30">
                    <div className="p-4" style={{ background: '#fef2f2' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle size={18} className="text-danger" />
                            <h3 className="font-bold text-danger text-sm">
                                {overlaps.length} Overlap{overlaps.length !== 1 ? 's' : ''} Detected
                            </h3>
                            <button
                                onClick={() => setShowOverlapsOnly(!showOverlapsOnly)}
                                className={`btn btn-sm ml-auto ${showOverlapsOnly ? 'btn-danger' : 'btn-outline'}`}
                                style={showOverlapsOnly ? {} : { borderColor: '#ef4444', color: '#ef4444' }}
                            >
                                {showOverlapsOnly ? 'Show All Orders' : 'Show Overlaps Only'}
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table" style={{ fontSize: '0.8rem' }}>
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Product</th>
                                        <th>Date</th>
                                        <th className="text-center">Weekly Qty</th>
                                        <th className="text-center">Daily Qty</th>
                                        <th className="text-center">Resolve</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {overlaps.map((ov: any, i: number) => {
                                        const key = `${ov.customer_id}-${ov.product_id}-${ov.delivery_date}`;
                                        const isResolving = resolvingKey === key;
                                        return (
                                            <tr key={i}>
                                                <td className="font-medium">{ov.customer_name}</td>
                                                <td>{ov.product_name}</td>
                                                <td>{ov.delivery_date}</td>
                                                <td className="text-center font-bold text-blue-600">{ov.weekly}</td>
                                                <td className="text-center font-bold text-green-600">{ov.daily}</td>
                                                <td className="text-center">
                                                    {isResolving ? (
                                                        <Loader2 size={14} className="animate-spin text-primary mx-auto" />
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => handleResolve(ov, 'weekly')}
                                                                className="btn btn-sm"
                                                                style={{ padding: '2px 8px', fontSize: '0.7rem', background: '#3b82f6', color: 'white', border: 'none' }}
                                                                title="Keep weekly order, remove daily"
                                                            >
                                                                Keep Weekly
                                                            </button>
                                                            <button
                                                                onClick={() => handleResolve(ov, 'daily')}
                                                                className="btn btn-sm"
                                                                style={{ padding: '2px 8px', fontSize: '0.7rem', background: '#10b981', color: 'white', border: 'none' }}
                                                                title="Keep daily order, remove weekly"
                                                            >
                                                                Keep Daily
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-muted" />
                        <span className="text-sm font-semibold text-foreground">Filters:</span>
                    </div>
                    <select
                        value={filterCustomer}
                        onChange={(e) => setFilterCustomer(e.target.value)}
                        className="form-input py-2 text-sm"
                        style={{ minWidth: '180px' }}
                    >
                        <option value="">All Customers</option>
                        {customers.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="form-input py-2 text-sm"
                        style={{ minWidth: '140px' }}
                    >
                        <option value="">All Types</option>
                        <option value="weekly">Weekly</option>
                        <option value="daily">Daily</option>
                    </select>
                    {(filterCustomer || filterType || showOverlapsOnly) && (
                        <button
                            onClick={() => { setFilterCustomer(''); setFilterType(''); setShowOverlapsOnly(false); }}
                            className="btn btn-ghost btn-sm"
                        >
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Orders Table */}
            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Type</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Total Qty</th>
                            <th>Submitted</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map((order: any) => {
                            const hasOverlap = isOverlapping(order);
                            return (
                                <tr key={order.id} className={hasOverlap ? 'bg-red-50' : ''}>
                                    <td className="font-medium">
                                        {(order.customer as any)?.name || 'Unknown'}
                                        {hasOverlap && (
                                            <span className="badge badge-danger ml-2 text-xs">OVERLAP</span>
                                        )}
                                    </td>
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
                                    <td className="font-bold text-primary">
                                        {order.order_items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0}
                                    </td>
                                    <td className="text-muted text-sm">
                                        {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setSelectedOrder(order)} className="btn btn-ghost btn-sm" title="View Details">
                                                <Eye size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(order.id)} className="btn btn-ghost btn-sm text-danger" title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredOrders.length === 0 && (
                    <div className="p-8 text-center text-muted">No orders found.</div>
                )}
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '650px' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Order Details</h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-muted hover:text-foreground"><X size={20} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                                <span className="text-muted">Customer:</span>
                                <p className="font-bold">{(selectedOrder.customer as any)?.name}</p>
                            </div>
                            <div>
                                <span className="text-muted">Type:</span>
                                <p><span className={`badge ${selectedOrder.order_type === 'weekly' ? 'badge-info' : 'badge-success'}`}>{selectedOrder.order_type}</span></p>
                            </div>
                            <div>
                                <span className="text-muted">Date:</span>
                                <p className="font-bold">
                                    {selectedOrder.order_type === 'weekly'
                                        ? `Week of ${selectedOrder.week_start_date}`
                                        : selectedOrder.delivery_date}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted">Submitted:</span>
                                <p className="font-bold">{format(new Date(selectedOrder.created_at), 'MMM dd, yyyy HH:mm')}</p>
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Delivery Date</th>
                                    <th className="text-center">Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedOrder.order_items?.map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="font-medium">{item.product?.name || 'Unknown'}</td>
                                        <td>{item.delivery_date}</td>
                                        <td className="text-center font-bold text-primary">{item.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
