'use client';

import { useState, useEffect, useRef } from 'react';
import { getMyOrders, getMyOrderById } from '@/actions/orders';
import { History, CalendarDays, CalendarPlus, Package, Loader2, Search, Eye, Pencil, CheckCircle, Clock } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function OrderHistoryPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [viewLoading, setViewLoading] = useState<string | null>(null);
    const activeFilters = useRef<any>({});

    // Server-side filter effect — search only commits on Enter, dropdown fires immediately
    useEffect(() => {
        const filters = {
            orderType: filterType || undefined,
            search: searchQuery || undefined,
        };
        loadData(filters);
    }, [searchQuery, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

    async function loadData(filters: any = {}) {
        setLoading(true);
        activeFilters.current = filters;
        const result = await getMyOrders(1, 20, filters);
        setOrders(result.data);
        setTotalCount(result.count);
        setHasMore(result.hasMore);
        setPage(1);
        setLoading(false);
    }

    async function loadMore() {
        setLoadingMore(true);
        const next = page + 1;
        const result = await getMyOrders(next, 20, activeFilters.current);
        setOrders(prev => { const ids = new Set(prev.map((o: any) => o.id)); return [...prev, ...result.data.filter((o: any) => !ids.has(o.id))]; });
        setTotalCount(result.count);
        setHasMore(result.hasMore);
        setPage(next);
        setLoadingMore(false);
    }

    async function handleView(order: any) {
        if (selectedOrder?.id === order.id) {
            setSelectedOrder(null);
            return;
        }
        setViewLoading(order.id);
        const fresh = await getMyOrderById(order.id);
        const data = fresh || order;
        setSelectedOrder(data);
        if (fresh) {
            setOrders(prev => prev.map(o => o.id === order.id ? fresh : o));
        }
        setViewLoading(null);
    }

    function isOrderPast(order: any): boolean {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (order.order_type === 'weekly') {
            return addDays(parseISO(order.week_start_date), 6) < today;
        }
        return parseISO(order.delivery_date) < today;
    }

    // Build weekly grid for display
    function buildWeeklyGrid(order: any) {
        if (order.order_type !== 'weekly' || !order.week_start_date) return null;
        const weekStart = parseISO(order.week_start_date);
        const days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));

        const productMap = new Map<string, string>();
        for (const item of order.order_items || []) {
            productMap.set(item.product_id, item.product?.name || 'Unknown');
        }

        const grid: { product_name: string; quantities: { [date: string]: number } }[] = [];
        for (const [productId, productName] of productMap) {
            const quantities: { [date: string]: number } = {};
            for (const day of days) {
                const item = (order.order_items || []).find(
                    (i: any) => i.product_id === productId && i.delivery_date === day
                );
                quantities[day] = item?.quantity || 0;
            }
            grid.push({ product_name: productName, quantities });
        }

        return { days, grid };
    }

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
                        <History size={24} className="text-primary" />
                        Order History
                    </h1>
                    <p className="text-muted text-sm mt-1">{orders.length} total orders</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by date, product... (press Enter)"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') setSearchQuery(searchInput); }}
                            className="form-input text-sm w-full"
                            style={{ minWidth: '220px', paddingLeft: '36px' }}
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="form-input py-1.5 text-sm"
                    >
                        <option value="">All Types</option>
                        <option value="weekly">Weekly</option>
                        <option value="daily">Daily</option>
                    </select>
                </div>
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
                                <div className="flex items-center gap-3">
                                    <span className={`badge ${order.order_type === 'weekly' ? 'badge-info' : 'badge-success'}`}>
                                        {order.order_type}
                                    </span>
                                    {order.status === 'confirmed' ? (
                                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <CheckCircle size={12} /> Confirmed
                                        </span>
                                    ) : (
                                        <span className="badge" style={{ background: '#fef3c7', color: '#92400e', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} /> Pending
                                        </span>
                                    )}
                                    <span className="text-xs text-muted">
                                        {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                                    </span>
                                    <button
                                        onClick={() => handleView(order)}
                                        disabled={viewLoading === order.id}
                                        className="btn btn-ghost btn-sm"
                                    >
                                        {viewLoading === order.id
                                            ? <Loader2 size={14} className="animate-spin" />
                                            : <Eye size={14} />}
                                        {selectedOrder?.id === order.id ? 'Hide' : 'View'}
                                    </button>
                                    {!isOrderPast(order) && (
                                        <a
                                            href={
                                                order.order_type === 'weekly'
                                                    ? `/dashboard/weekly-order?week=${order.week_start_date}`
                                                    : `/dashboard/daily-order?date=${order.delivery_date}`
                                            }
                                            className="btn btn-outline btn-sm"
                                        >
                                            <Pencil size={14} /> Edit
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Expanded detail view */}
                            {selectedOrder?.id === order.id && (
                                <div className="p-4">
                                    {selectedOrder.order_type === 'weekly' ? (
                                        (() => {
                                            const gridData = buildWeeklyGrid(selectedOrder);
                                            if (!gridData) return null;
                                            return (
                                                <div className="overflow-x-auto">
                                                    <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                                        <thead>
                                                            <tr>
                                                                <th style={{ minWidth: '150px' }}>Product</th>
                                                                {gridData.days.map((day, i) => (
                                                                    <th key={day} className="text-center" style={{ minWidth: '65px' }}>
                                                                        <div>{DAY_LABELS[i]}</div>
                                                                        <div style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.7 }}>
                                                                            {format(parseISO(day), 'dd/MM')}
                                                                        </div>
                                                                    </th>
                                                                ))}
                                                                <th className="text-center">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {gridData.grid.map((row, i) => {
                                                                const total = Object.values(row.quantities).reduce((s, q) => s + q, 0);
                                                                return (
                                                                    <tr key={i}>
                                                                        <td className="font-medium">{row.product_name}</td>
                                                                        {gridData.days.map((day) => (
                                                                            <td key={day} className="text-center">
                                                                                {row.quantities[day] > 0 ? (
                                                                                    <span className="font-bold text-primary">{row.quantities[day]}</span>
                                                                                ) : (
                                                                                    <span className="text-gray-300">—</span>
                                                                                )}
                                                                            </td>
                                                                        ))}
                                                                        <td className="text-center font-bold" style={{ background: '#f1f5f9' }}>{total}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })()
                                    ) : (
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
                                                        <td className="text-muted">{item.delivery_date}</td>
                                                        <td className="text-center font-bold text-primary">{item.quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                    <div className="mt-3 text-right text-sm text-muted">
                                        <Package size={14} className="inline mr-1" />
                                        Total: <strong className="text-primary">
                                            {selectedOrder.order_items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0}
                                        </strong> items
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card p-12 text-center">
                    <History size={48} className="mx-auto mb-3 text-muted opacity-30" />
                    <h3 className="text-lg font-bold text-foreground">No orders found</h3>
                    <p className="text-muted text-sm mt-1">
                        {searchQuery || filterType ? 'Try adjusting your search or filters.' : 'Your order history will appear here after you submit orders.'}
                    </p>
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center mt-4">
                    <button onClick={loadMore} disabled={loadingMore} className="btn btn-outline btn-sm">
                        {loadingMore && <Loader2 size={14} className="animate-spin" />}
                        {loadingMore ? 'Loading...' : `Load More (${totalCount - orders.length} remaining)`}
                    </button>
                </div>
            )}
        </div>
    );
}
