'use client';

import { useState, useEffect, useMemo } from 'react';
import { getOrders, getOverlaps, deleteOrder, resolveOverlap, updateOrderItems } from '@/actions/orders';
import { getCustomers } from '@/actions/users';
import { ShoppingCart, AlertTriangle, Trash2, Eye, Loader2, Search, Filter, X, Check, Save, Edit, CalendarDays } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [overlaps, setOverlaps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterType, setFilterType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showOverlapsOnly, setShowOverlapsOnly] = useState(false);
    const [resolvingKey, setResolvingKey] = useState<string | null>(null);

    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editItems, setEditItems] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

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
        setSelectedOrder(null);
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

    function openOrderDetail(order: any) {
        setSelectedOrder(order);
        setIsEditing(false);
        setEditItems([]);
    }

    function startEditing() {
        if (!selectedOrder) return;
        // Clone items for editing
        const items = selectedOrder.order_items?.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product?.name || 'Unknown',
            delivery_date: item.delivery_date,
            quantity: item.quantity,
        })) || [];
        setEditItems(items);
        setIsEditing(true);
    }

    function updateEditQuantity(itemId: string, newQty: number) {
        setEditItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, quantity: Math.max(0, newQty) } : item
            )
        );
    }

    async function handleSaveEdit() {
        if (!selectedOrder) return;
        setSaving(true);
        const itemsToSave = editItems
            .filter((i) => i.quantity > 0)
            .map((i) => ({
                product_id: i.product_id,
                delivery_date: i.delivery_date,
                quantity: i.quantity,
            }));

        const result = await updateOrderItems(selectedOrder.id, itemsToSave);
        if (result.error) {
            alert('Error saving: ' + result.error);
        } else {
            setIsEditing(false);
            setSelectedOrder(null);
            loadData();
        }
        setSaving(false);
    }

    // Build weekly grid data for display
    function buildWeeklyGrid(order: any, items: any[]) {
        if (order.order_type !== 'weekly' || !order.week_start_date) return null;

        const weekStart = parseISO(order.week_start_date);
        const days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));

        // Collect unique products
        const productMap = new Map<string, string>();
        for (const item of items) {
            const name = item.product_name || item.product?.name || 'Unknown';
            productMap.set(item.product_id, name);
        }

        const grid: { product_id: string; product_name: string; quantities: { [date: string]: { qty: number; itemId?: string } } }[] = [];

        for (const [productId, productName] of productMap) {
            const quantities: { [date: string]: { qty: number; itemId?: string } } = {};
            for (const day of days) {
                const item = items.find((i: any) => i.product_id === productId && i.delivery_date === day);
                quantities[day] = {
                    qty: item?.quantity || 0,
                    itemId: item?.id,
                };
            }
            grid.push({ product_id: productId, product_name: productName, quantities });
        }

        return { days, grid };
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

    // Filter with search
    const filteredOrders = useMemo(() => {
        return orders.filter((o) => {
            if (filterCustomer && o.customer_id !== filterCustomer) return false;
            if (filterType && o.order_type !== filterType) return false;
            if (showOverlapsOnly && !isOverlapping(o)) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const customerName = ((o.customer as any)?.name || '').toLowerCase();
                const date = o.order_type === 'weekly' ? (o.week_start_date || '') : (o.delivery_date || '');
                if (!customerName.includes(q) && !date.includes(q) && !o.order_type.includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }, [orders, filterCustomer, filterType, showOverlapsOnly, searchQuery, overlaps]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-primary" size={36} />
            </div>
        );
    }

    // Determine what to show in the detail modal
    const weeklyGridData = selectedOrder ? buildWeeklyGrid(
        selectedOrder,
        isEditing ? editItems : selectedOrder.order_items || []
    ) : null;

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
                                                            >
                                                                Keep Weekly
                                                            </button>
                                                            <button
                                                                onClick={() => handleResolve(ov, 'daily')}
                                                                className="btn btn-sm"
                                                                style={{ padding: '2px 8px', fontSize: '0.7rem', background: '#10b981', color: 'white', border: 'none' }}
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

            {/* Filters + Search */}
            <div className="card p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1" style={{ minWidth: '200px', maxWidth: '320px' }}>
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Search by customer, date..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="form-input pl-9 py-2 text-sm w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-muted" />
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
                    {(filterCustomer || filterType || showOverlapsOnly || searchQuery) && (
                        <button
                            onClick={() => { setFilterCustomer(''); setFilterType(''); setShowOverlapsOnly(false); setSearchQuery(''); }}
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
                                            <button onClick={() => openOrderDetail(order)} className="btn btn-ghost btn-sm" title="View / Edit">
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

            {/* Order Detail / Edit Modal */}
            {selectedOrder && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: selectedOrder.order_type === 'weekly' ? '900px' : '650px' }}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                {isEditing ? (
                                    <><Edit size={18} className="text-primary" /> Edit Order</>
                                ) : (
                                    <><CalendarDays size={18} className="text-primary" /> Order Details</>
                                )}
                            </h3>
                            <div className="flex items-center gap-2">
                                {!isEditing ? (
                                    <button onClick={startEditing} className="btn btn-primary btn-sm">
                                        <Edit size={14} /> Edit
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => setIsEditing(false)} className="btn btn-ghost btn-sm">
                                            Cancel
                                        </button>
                                        <button onClick={handleSaveEdit} disabled={saving} className="btn btn-primary btn-sm">
                                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                                        </button>
                                    </>
                                )}
                                <button onClick={() => { setSelectedOrder(null); setIsEditing(false); }} className="text-muted hover:text-foreground ml-1">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Order Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 text-sm">
                            <div>
                                <span className="text-muted text-xs">Customer</span>
                                <p className="font-bold">{(selectedOrder.customer as any)?.name}</p>
                            </div>
                            <div>
                                <span className="text-muted text-xs">Type</span>
                                <p><span className={`badge ${selectedOrder.order_type === 'weekly' ? 'badge-info' : 'badge-success'}`}>{selectedOrder.order_type}</span></p>
                            </div>
                            <div>
                                <span className="text-muted text-xs">Date</span>
                                <p className="font-bold">
                                    {selectedOrder.order_type === 'weekly'
                                        ? `Week of ${selectedOrder.week_start_date}`
                                        : selectedOrder.delivery_date}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted text-xs">Submitted</span>
                                <p className="font-bold">{format(new Date(selectedOrder.created_at), 'MMM dd, HH:mm')}</p>
                            </div>
                        </div>

                        {/* Weekly Grid View */}
                        {selectedOrder.order_type === 'weekly' && weeklyGridData ? (
                            <div className="overflow-x-auto">
                                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: '160px' }}>Product</th>
                                            {weeklyGridData.days.map((day, i) => (
                                                <th key={day} className="text-center" style={{ minWidth: '70px' }}>
                                                    <div>{DAY_LABELS[i]}</div>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.7 }}>
                                                        {format(parseISO(day), 'dd/MM')}
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="text-center" style={{ minWidth: '60px' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {weeklyGridData.grid.map((row) => {
                                            const rowTotal = Object.values(row.quantities).reduce((sum, q) => sum + q.qty, 0);
                                            return (
                                                <tr key={row.product_id}>
                                                    <td className="font-medium">{row.product_name}</td>
                                                    {weeklyGridData.days.map((day) => {
                                                        const cell = row.quantities[day];
                                                        if (isEditing) {
                                                            const editItem = editItems.find(
                                                                (ei) => ei.product_id === row.product_id && ei.delivery_date === day
                                                            );
                                                            return (
                                                                <td key={day} className="text-center p-1">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={editItem?.quantity ?? 0}
                                                                        onChange={(e) => {
                                                                            if (editItem) {
                                                                                updateEditQuantity(editItem.id, parseInt(e.target.value) || 0);
                                                                            }
                                                                        }}
                                                                        className="form-input text-center py-1 px-1"
                                                                        style={{ width: '55px', fontSize: '0.85rem' }}
                                                                    />
                                                                </td>
                                                            );
                                                        }
                                                        return (
                                                            <td key={day} className="text-center">
                                                                {cell.qty > 0 ? (
                                                                    <span className="font-bold text-primary">{cell.qty}</span>
                                                                ) : (
                                                                    <span className="text-gray-300">—</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="text-center font-bold" style={{ background: '#f1f5f9' }}>
                                                        {isEditing
                                                            ? editItems
                                                                .filter((ei) => ei.product_id === row.product_id)
                                                                .reduce((sum, ei) => sum + ei.quantity, 0)
                                                            : rowTotal}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* Daily order — simple table */
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Delivery Date</th>
                                        <th className="text-center">Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(isEditing ? editItems : selectedOrder.order_items)?.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="font-medium">{item.product_name || item.product?.name || 'Unknown'}</td>
                                            <td>{item.delivery_date}</td>
                                            <td className="text-center">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.quantity}
                                                        onChange={(e) => updateEditQuantity(item.id, parseInt(e.target.value) || 0)}
                                                        className="form-input text-center py-1"
                                                        style={{ width: '70px', fontSize: '0.85rem' }}
                                                    />
                                                ) : (
                                                    <span className="font-bold text-primary">{item.quantity}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* Footer actions */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                            <button
                                onClick={() => handleDelete(selectedOrder.id)}
                                className="btn btn-ghost btn-sm text-danger"
                            >
                                <Trash2 size={14} /> Delete Order
                            </button>
                            <div className="text-sm text-muted">
                                Order ID: <code className="text-xs">{selectedOrder.id.slice(0, 8)}...</code>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
