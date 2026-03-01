'use client';

import { useState, useEffect } from 'react';
import { getActiveProducts } from '@/actions/products';
import { getSettings } from '@/actions/settings';
import { submitWeeklyOrder } from '@/actions/orders';
import { getAvailableMondays, canSubmitWeeklyOrder } from '@/lib/cutoff';
import { format, addDays, parseISO } from 'date-fns';
import { CalendarDays, Check, AlertTriangle, Loader2, Plus, X, Info } from 'lucide-react';
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
    const [error, setError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showProductPicker, setShowProductPicker] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                const [prods, setts] = await Promise.all([
                    getActiveProducts(),
                    getSettings(),
                ]);
                setProducts(prods);
                setSettings(setts);

                const mondays = getAvailableMondays(setts, new Date());
                setAvailableMondays(mondays);

                if (mondays.length > 0) {
                    const firstMonday = format(mondays[0], 'yyyy-MM-dd');
                    setSelectedMonday(firstMonday);
                    initializeRows(prods, firstMonday);
                }
            } catch (e) {
                setError('Failed to load order data.');
            }
            setLoading(false);
        }
        loadData();
    }, []);

    function initializeRows(prods: Product[], monday: string) {
        const dates = getDatesForWeek(monday);
        const rows: OrderRow[] = prods.slice(0, 10).map((p) => ({
            product_id: p.id,
            product_name: p.name,
            quantities: Object.fromEntries(dates.map((d) => [d, 0])),
            isDefault: true,
        }));
        setOrderRows(rows);
    }

    function getDatesForWeek(monday: string): string[] {
        const start = parseISO(monday);
        return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
    }

    function handleMondayChange(monday: string) {
        setSelectedMonday(monday);
        const dates = getDatesForWeek(monday);
        setOrderRows((prev) =>
            prev.map((row) => ({
                ...row,
                quantities: Object.fromEntries(dates.map((d) => [d, 0])),
            }))
        );
    }

    function updateQuantity(productId: string, date: string, value: number) {
        setOrderRows((prev) =>
            prev.map((row) =>
                row.product_id === productId
                    ? { ...row, quantities: { ...row.quantities, [date]: Math.max(0, value) } }
                    : row
            )
        );
    }

    function setAllDaysForProduct(productId: string, value: number) {
        setOrderRows((prev) =>
            prev.map((row) =>
                row.product_id === productId
                    ? {
                        ...row,
                        quantities: Object.fromEntries(
                            Object.keys(row.quantities).map((d) => [d, Math.max(0, value)])
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

        const items = orderRows
            .filter((row) => getTotalForProduct(row) > 0)
            .map((row) => ({
                product_id: row.product_id,
                quantities: row.quantities,
            }));

        const result = await submitWeeklyOrder(selectedMonday, items);

        if (result.error) {
            setError(result.error);
            setSubmitting(false);
            setShowConfirmModal(false);
        } else {
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
                <h2 className="text-2xl font-bold text-foreground mb-2">Order Submitted!</h2>
                <p className="text-muted mb-6">
                    Your weekly order for the week of {selectedMonday} has been submitted successfully.
                    A confirmation email will be sent shortly.
                </p>
                <a href="/dashboard" className="btn btn-primary">Back to Dashboard</a>
            </div>
        );
    }

    const dates = getDatesForWeek(selectedMonday);
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const availableToAdd = products.filter(
        (p) => !orderRows.some((r) => r.product_id === p.id)
    );

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
                        className="form-input py-2 px-4 text-sm"
                        style={{ minWidth: '200px' }}
                    >
                        {availableMondays.map((m) => (
                            <option key={format(m, 'yyyy-MM-dd')} value={format(m, 'yyyy-MM-dd')}>
                                Week of {format(m, 'MMM dd, yyyy')}
                            </option>
                        ))}
                    </select>
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
                                            {dates.map((date) => (
                                                <td key={date}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={row.quantities[date] || ''}
                                                        onChange={(e) =>
                                                            updateQuantity(row.product_id, date, parseInt(e.target.value) || 0)
                                                        }
                                                        placeholder="0"
                                                    />
                                                </td>
                                            ))}
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
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Add Product Button */}
                    {availableToAdd.length > 0 && (
                        <div className="mb-6">
                            {showProductPicker ? (
                                <div className="card p-4 animate-fade-in">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="font-semibold text-sm">Add Product</p>
                                        <button onClick={() => setShowProductPicker(false)} className="text-muted hover:text-foreground">
                                            <X size={18} />
                                        </button>
                                    </div>
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
                                </div>
                            ) : (
                                <button onClick={() => setShowProductPicker(true)} className="btn btn-outline btn-sm">
                                    <Plus size={16} /> Add Product
                                </button>
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted">
                            <Info size={14} />
                            Orders are locked after submission and cannot be edited.
                        </div>
                        <button
                            onClick={() => setShowConfirmModal(true)}
                            disabled={!hasAnyQuantity()}
                            className="btn btn-success"
                            style={{ padding: '12px 28px', fontSize: '0.95rem' }}
                        >
                            <Check size={18} /> Review & Submit Order
                        </button>
                    </div>
                </>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '700px' }}>
                        <h3 className="text-xl font-bold mb-4">Confirm Weekly Order</h3>
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

                        <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: '#fef3c7' }}>
                            <AlertTriangle size={16} className="text-warning flex-shrink-0" />
                            <span className="text-sm text-yellow-800">
                                This order cannot be edited after submission.
                            </span>
                        </div>

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
                                        <Loader2 className="animate-spin" size={16} /> Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} /> Confirm & Submit
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
