'use client';

import { useState, useEffect } from 'react';
import { getActiveProductsForCustomer } from '@/actions/tags';
import { getMyDefaultProducts } from '@/actions/users';
import { getSettings } from '@/actions/settings';
import { submitWeeklyOrder, getLastWeeklyOrder, getMyWeeklyOrder, editWeeklyOrder } from '@/actions/orders';
import { getAvailableMondays, canSubmitDailyOrder, isProductDayLocked } from '@/lib/cutoff';
import { format, addDays, parseISO } from 'date-fns';
import { CalendarDays, Check, AlertTriangle, Loader2, Plus, X, Info, RotateCcw, Lock } from 'lucide-react';
import { Product, Settings } from '@/lib/types';

interface OrderRow {
    product_id: string;
    product_name: string;
    quantities: { [date: string]: number };
    isDefault: boolean;
}

export default function WeeklyOrderPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [availableMondays, setAvailableMondays] = useState<Date[]>([]);
    const [selectedMonday, setSelectedMonday] = useState<string>('');
    const [orderRows, setOrderRows] = useState<OrderRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [wasEdit, setWasEdit] = useState(false);
    const [error, setError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [loadingLastWeek, setLoadingLastWeek] = useState(false);
    const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
    const [defaultProds, setDefaultProds] = useState<Product[]>([]);
    const [poNumbers, setPoNumbers] = useState<{ [date: string]: string }>({});

    useEffect(() => {
        async function loadData() {
            try {
                const [prods, setts, defProds] = await Promise.all([
                    getActiveProductsForCustomer(),
                    getSettings(),
                    getMyDefaultProducts(),
                ]);
                setProducts(prods);
                setSettings(setts);
                setDefaultProds(defProds);

                const mondays = getAvailableMondays(setts, new Date());

                // Check for week query param (coming from history "Edit" button)
                const params = new URLSearchParams(window.location.search);
                const weekParam = params.get('week');

                // If a specific past week is requested for editing, include it even if past creation cutoff
                const allMondayStrs = mondays.map((m) => format(m, 'yyyy-MM-dd'));
                if (weekParam && !allMondayStrs.includes(weekParam)) {
                    mondays.unshift(parseISO(weekParam));
                }
                setAvailableMondays(mondays);

                if (mondays.length > 0) {
                    const firstMonday = weekParam ?? format(mondays[0], 'yyyy-MM-dd');
                    setSelectedMonday(firstMonday);
                    await checkAndLoadExistingOrder(firstMonday, defProds, setts);
                }
            } catch (e) {
                setError('Failed to load order data.');
            }
            setLoading(false);
        }
        loadData();
    }, []);

    async function checkAndLoadExistingOrder(monday: string, prods: Product[], setts: Settings) {
        const existing = await getMyWeeklyOrder(monday);
        if (existing) {
            setExistingOrderId(existing.id);
            const dates = getDatesForWeek(monday);
            const productMap = new Map<string, OrderRow>();
            const loadedPo: { [date: string]: string } = {};
            for (const item of (existing.order_items ?? []) as any[]) {
                if (!productMap.has(item.product_id)) {
                    productMap.set(item.product_id, {
                        product_id: item.product_id,
                        product_name: item.product?.name ?? 'Unknown',
                        quantities: Object.fromEntries(dates.map((d) => [d, 0])),
                        isDefault: false,
                    });
                }
                productMap.get(item.product_id)!.quantities[item.delivery_date] = item.quantity;
                if (item.po_number && !loadedPo[item.delivery_date]) {
                    loadedPo[item.delivery_date] = item.po_number;
                }
            }
            setPoNumbers(loadedPo);
            setOrderRows(Array.from(productMap.values()));
        } else {
            setExistingOrderId(null);
            setPoNumbers({});
            initializeRows(prods, monday);
        }
    }

    function initializeRows(prods: Product[], monday: string) {
        const dates = getDatesForWeek(monday);
        const rows: OrderRow[] = prods.map((p) => ({
            product_id: p.id,
            product_name: p.name,
            quantities: Object.fromEntries(dates.map((d) => [d, 0])),
            isDefault: true,
        }));
        setOrderRows(rows);
        setPoNumbers({});
    }

    function getDatesForWeek(monday: string): string[] {
        const start = parseISO(monday);
        return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
    }

    function isDayLocked(date: string): boolean {
        if (!settings) return false;
        return !canSubmitDailyOrder(parseISO(date), settings).allowed;
    }

    function isRowDayLocked(date: string, row: OrderRow): boolean {
        if (!settings) return false;
        const prod = products.find((p) => p.id === row.product_id);
        return isProductDayLocked(parseISO(date), prod ?? {}, settings);
    }

    async function handleMondayChange(monday: string) {
        setSelectedMonday(monday);
        if (settings) {
            try {
                await checkAndLoadExistingOrder(monday, defaultProds, settings);
            } catch {
                // silently fall back — rows already reset via setSelectedMonday
            }
        }
    }

    async function loadLastWeekOrder() {
        setLoadingLastWeek(true);
        try {
            const lastOrder = await getLastWeeklyOrder();
            if (!lastOrder || lastOrder.items.length === 0) {
                alert('No previous weekly order found.');
                setLoadingLastWeek(false);
                return;
            }

            const currentDates = getDatesForWeek(selectedMonday);
            const lastMonday = parseISO(lastOrder.week_start_date);

            const productMap = new Map<string, { product_name: string; quantities: { [date: string]: number } }>();

            for (const item of lastOrder.items) {
                const itemDate = parseISO(item.delivery_date);
                const dayOffset = Math.round((itemDate.getTime() - lastMonday.getTime()) / (1000 * 60 * 60 * 24));

                if (dayOffset >= 0 && dayOffset < 7) {
                    const targetDate = currentDates[dayOffset];
                    if (!productMap.has(item.product_id)) {
                        productMap.set(item.product_id, {
                            product_name: item.product_name,
                            quantities: Object.fromEntries(currentDates.map((d) => [d, 0])),
                        });
                    }
                    // Don't overwrite locked days when loading last week
                    const tempRow = productMap.get(item.product_id)!;
                    const prod = products.find((p) => p.id === item.product_id);
                    if (!isProductDayLocked(parseISO(targetDate), prod ?? {}, settings!)) {
                        tempRow.quantities[targetDate] = item.quantity;
                    }
                }
            }

            const newRows: OrderRow[] = Array.from(productMap.entries()).map(([product_id, data]) => ({
                product_id,
                product_name: data.product_name,
                quantities: data.quantities,
                isDefault: false,
            }));

            setOrderRows(newRows);
        } catch (e) {
            alert('Failed to load last week\'s order.');
        }
        setLoadingLastWeek(false);
    }

    function updateQuantity(productId: string, date: string, value: number) {
        setOrderRows((prev) => {
            const row = prev.find((r) => r.product_id === productId);
            if (!row || isRowDayLocked(date, row)) return prev;
            return prev.map((r) =>
                r.product_id === productId
                    ? { ...r, quantities: { ...r.quantities, [date]: Math.max(0, value) } }
                    : r
            );
        });
    }

    function setAllDaysForProduct(productId: string, value: number) {
        setOrderRows((prev) =>
            prev.map((row) =>
                row.product_id === productId
                    ? {
                        ...row,
                        quantities: Object.fromEntries(
                            Object.keys(row.quantities).map((d) => [
                                d,
                                isRowDayLocked(d, row) ? row.quantities[d] : Math.max(0, value),
                            ])
                        ),
                    }
                    : row
            )
        );
    }

    function addProduct(product: Product) {
        if (orderRows.some((r) => r.product_id === product.id)) return;
        const dates = getDatesForWeek(selectedMonday);
        setOrderRows((prev) => [
            ...prev,
            {
                product_id: product.id,
                product_name: product.name,
                quantities: Object.fromEntries(dates.map((d) => [d, 0])),
                isDefault: false,
            },
        ]);
        setShowProductPicker(false);
    }

    function removeProduct(productId: string) {
        setOrderRows((prev) => prev.filter((r) => r.product_id !== productId));
    }

    function getTotalForProduct(row: OrderRow): number {
        return Object.values(row.quantities).reduce((sum, q) => sum + q, 0);
    }

    function getTotalForDate(date: string): number {
        return orderRows.reduce((sum, row) => sum + (row.quantities[date] || 0), 0);
    }

    function getGrandTotal(): number {
        return orderRows.reduce((sum, row) => sum + getTotalForProduct(row), 0);
    }

    function hasAnyQuantity(): boolean {
        return orderRows.some((row) => Object.values(row.quantities).some((q) => q > 0));
    }

    async function handleSubmit() {
        setSubmitting(true);
        setError('');

        let result;

        if (existingOrderId) {
            const flatItems = orderRows
                .filter((row) => getTotalForProduct(row) > 0)
                .flatMap((row) =>
                    Object.entries(row.quantities)
                        .filter(([date, qty]) => qty > 0)
                        .map(([date, qty]) => ({
                            product_id: row.product_id,
                            delivery_date: date,
                            quantity: qty,
                            ...(poNumbers[date] ? { po_number: poNumbers[date] } : {}),
                        }))
                );
            result = await editWeeklyOrder(existingOrderId, flatItems);
        } else {
            const items = orderRows
                .filter((row) => getTotalForProduct(row) > 0)
                .map((row) => ({
                    product_id: row.product_id,
                    quantities: row.quantities,
                }));
            result = await submitWeeklyOrder(selectedMonday, items, poNumbers);
        }

        if (result.error) {
            setError(result.error);
            setSubmitting(false);
            setShowConfirmModal(false);
        } else {
            setWasEdit(!!existingOrderId);
            setSuccess(true);
            setShowConfirmModal(false);
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-primary" size={36} />
            </div>
        );
    }

    if (success) {
        return (
            <div className="max-w-lg mx-auto text-center py-24 animate-fade-in">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    <Check size={36} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                    {wasEdit ? 'Order Updated!' : 'Order Submitted!'}
                </h2>
                <p className="text-muted mb-6">
                    {wasEdit
                        ? `Your weekly order for the week of ${selectedMonday} has been updated successfully.`
                        : `Your weekly order for the week of ${selectedMonday} has been submitted successfully. A confirmation email will be sent shortly.`
                    }
                </p>
                <a href="/dashboard" className="btn btn-primary">Back to Dashboard</a>
            </div>
        );
    }

    const dates = getDatesForWeek(selectedMonday);
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const availableToAdd = products
        .filter((p) => !orderRows.some((r) => r.product_id === p.id))
        .filter((p) => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()));

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <CalendarDays size={24} className="text-primary" />
                        Weekly Order
                    </h1>
                    <p className="text-muted text-sm mt-1">Enter quantities for each product per day</p>
                </div>

                {/* Week Selector */}
                <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-foreground">Select Week:</label>
                    <select
                        value={selectedMonday}
                        onChange={(e) => handleMondayChange(e.target.value)}
                        className="form-input py-1.5 px-4 text-sm"
                        style={{ minWidth: '200px' }}
                    >
                        {availableMondays.map((m) => (
                            <option key={format(m, 'yyyy-MM-dd')} value={format(m, 'yyyy-MM-dd')}>
                                Week of {format(m, 'MMM dd, yyyy')}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={loadLastWeekOrder}
                        disabled={loadingLastWeek}
                        className="btn btn-outline btn-sm"
                        title="Fill with last week's order"
                    >
                        {loadingLastWeek ? (
                            <><Loader2 size={14} className="animate-spin" /> Loading...</>
                        ) : (
                            <><RotateCcw size={14} /> Same as Last Week</>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg badge-danger text-sm font-medium flex items-center gap-2 animate-fade-in">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            {availableMondays.length === 0 ? (
                <div className="card p-12 text-center">
                    <AlertTriangle size={40} className="mx-auto mb-3 text-warning" />
                    <h3 className="text-lg font-bold">No Available Weeks</h3>
                    <p className="text-muted text-sm mt-1">The submission deadline has passed for all upcoming weeks.</p>
                </div>
            ) : (
                <>
                    {/* Edit mode banner */}
                    {existingOrderId && (
                        <div className="mb-4 flex items-center gap-2 p-3 rounded-lg text-sm"
                            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                            <Info size={14} className="flex-shrink-0" />
                            You are editing your existing order for this week. Days that have passed their cutoff are locked and cannot be changed.
                        </div>
                    )}

                    {/* Order Grid */}
                    <div className="card mb-6">
                        <div className="order-grid">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        {dates.map((date, i) => (
                                            <th key={date}>
                                                <div>{dayNames[i]}</div>
                                                <div className="text-xs opacity-75 font-normal">
                                                    {format(parseISO(date), 'dd/MM')}
                                                </div>
                                            </th>
                                        ))}
                                        <th>Total</th>
                                        <th style={{ width: '70px' }}>All Days</th>
                                        <th style={{ width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderRows.map((row) => (
                                        <tr key={row.product_id}>
                                            <td className="font-medium text-sm">{row.product_name}</td>
                                            {dates.map((date) => {
                                                const locked = isRowDayLocked(date, row);
                                                return (
                                                    <td key={date}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={row.quantities[date] || ''}
                                                            onChange={(e) =>
                                                                updateQuantity(row.product_id, date, parseInt(e.target.value) || 0)
                                                            }
                                                            disabled={locked}
                                                            placeholder={locked ? '—' : '0'}
                                                            style={locked ? { background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' } : {}}
                                                        />
                                                        {locked && (
                                                            <div className="flex items-center justify-center gap-1 mt-1" style={{ color: '#ef4444', fontSize: '10px' }}>
                                                                <Lock size={9} />
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td>
                                                <span className="font-bold text-primary">{getTotalForProduct(row)}</span>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="Set all"
                                                    className="text-xs"
                                                    style={{ width: '65px' }}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setAllDaysForProduct(row.product_id, val);
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                {!row.isDefault && (
                                                    <button
                                                        onClick={() => removeProduct(row.product_id)}
                                                        className="text-danger hover:bg-red-50 rounded p-1 transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Totals Row */}
                                    <tr style={{ background: '#f1f5f9' }}>
                                        <td className="font-bold text-sm">Daily Totals</td>
                                        {dates.map((date) => (
                                            <td key={date}>
                                                <span className="font-bold text-primary">{getTotalForDate(date)}</span>
                                            </td>
                                        ))}
                                        <td>
                                            <span className="font-bold text-lg" style={{ color: 'var(--primary-dark)' }}>
                                                {getGrandTotal()}
                                            </span>
                                        </td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                    {/* PO Number Row */}
                                    <tr style={{ background: '#fefce8' }}>
                                        <td className="font-semibold text-sm" style={{ color: '#92400e' }}>PO Number</td>
                                        {dates.map((date) => (
                                            <td key={date}>
                                                <input
                                                    type="text"
                                                    value={poNumbers[date] || ''}
                                                    onChange={(e) => setPoNumbers((prev) => ({ ...prev, [date]: e.target.value }))}
                                                    placeholder="PO #"
                                                    style={{ fontSize: '0.75rem', padding: '4px 6px', width: '100%', textAlign: 'center' }}
                                                />
                                            </td>
                                        ))}
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Add Product Button */}
                    {products.some((p) => !orderRows.some((r) => r.product_id === p.id)) && (
                        <div className="mb-6">
                            {showProductPicker ? (
                                <div className="card p-4 animate-fade-in">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="font-semibold text-sm">Add Product</p>
                                        <button onClick={() => { setShowProductPicker(false); setProductSearch(''); }} className="text-muted hover:text-foreground">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="form-input mb-3"
                                        autoFocus
                                    />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {availableToAdd.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => addProduct(p)}
                                                className="btn btn-outline btn-sm text-left"
                                            >
                                                <Plus size={14} /> {p.name}
                                            </button>
                                        ))}
                                    </div>
                                    {availableToAdd.length === 0 && (
                                        <p className="text-sm text-muted">No products found.</p>
                                    )}
                                </div>
                            ) : (
                                <button onClick={() => { setShowProductPicker(true); setProductSearch(''); }} className="btn btn-outline btn-sm">
                                    <Plus size={16} /> Add Product
                                </button>
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    {(() => {
                        const allDaysLocked = selectedMonday && orderRows.length > 0
                            ? getDatesForWeek(selectedMonday).every(date =>
                                orderRows.every(row => isRowDayLocked(date, row))
                            )
                            : false;
                        return (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted">
                                    <Info size={14} />
                                    {existingOrderId && allDaysLocked
                                        ? 'All days in this week are past their cutoff and cannot be edited.'
                                        : existingOrderId
                                            ? 'Past-due days are locked and cannot be modified.'
                                            : 'Review your order before submitting.'}
                                </div>
                                <button
                                    onClick={() => setShowConfirmModal(true)}
                                    disabled={!hasAnyQuantity() || (!!existingOrderId && allDaysLocked)}
                                    className="btn btn-success"
                                    style={{ padding: '12px 28px', fontSize: '0.95rem' }}
                                >
                                    <Check size={18} /> {existingOrderId ? 'Save Changes' : 'Review & Submit Order'}
                                </button>
                            </div>
                        );
                    })()}
                </>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '700px' }}>
                        <h3 className="text-xl font-bold mb-4">
                            {existingOrderId ? 'Confirm Order Changes' : 'Confirm Weekly Order'}
                        </h3>
                        <p className="text-muted text-sm mb-4">
                            Week of <strong>{selectedMonday && format(parseISO(selectedMonday), 'MMMM dd, yyyy')}</strong>
                        </p>

                        <div className="overflow-x-auto mb-6" style={{ maxHeight: '400px' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        {dayNames.map((d) => (
                                            <th key={d} className="text-center">{d}</th>
                                        ))}
                                        <th className="text-center">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderRows
                                        .filter((row) => getTotalForProduct(row) > 0)
                                        .map((row) => (
                                            <tr key={row.product_id}>
                                                <td className="font-medium">{row.product_name}</td>
                                                {dates.map((date) => (
                                                    <td key={date} className="text-center">
                                                        {row.quantities[date] || '-'}
                                                    </td>
                                                ))}
                                                <td className="text-center font-bold text-primary">
                                                    {getTotalForProduct(row)}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        {!existingOrderId && (
                            <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: '#fef3c7' }}>
                                <AlertTriangle size={16} className="text-warning flex-shrink-0" />
                                <span className="text-sm text-yellow-800">
                                    Please review your order carefully before submitting.
                                </span>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="btn btn-ghost"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="btn btn-success"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        {existingOrderId ? 'Saving...' : 'Submitting...'}
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        {existingOrderId ? 'Save Changes' : 'Confirm & Submit'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
