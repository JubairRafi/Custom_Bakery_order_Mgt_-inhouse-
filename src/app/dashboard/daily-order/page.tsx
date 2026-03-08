'use client';

import { useState, useEffect } from 'react';
import { getActiveProductsForCustomer } from '@/actions/tags';
import { getMyDefaultProducts } from '@/actions/users';
import { getSettings } from '@/actions/settings';
import { submitDailyOrder, getMyDailyOrder, editDailyOrder } from '@/actions/orders';
import { canSubmitDailyOrder, isProductDayLocked } from '@/lib/cutoff';
import { format, addDays, parseISO } from 'date-fns';
import { CalendarPlus, Check, AlertTriangle, Loader2, Plus, X, Info, Pencil, Lock } from 'lucide-react';
import { Product, Settings } from '@/lib/types';

interface DailyRow {
    product_id: string;
    product_name: string;
    quantity: number;
}

export default function DailyOrderPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [deliveryDate, setDeliveryDate] = useState('');
    const [orderRows, setOrderRows] = useState<DailyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [wasEdit, setWasEdit] = useState(false);
    const [error, setError] = useState('');
    const [cutoffMessage, setCutoffMessage] = useState('');
    const [canSubmit, setCanSubmit] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
    const [defaultRows, setDefaultRows] = useState<DailyRow[]>([]);

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

                const rows: DailyRow[] = defProds.map((p) => ({
                    product_id: p.id,
                    product_name: p.name,
                    quantity: 0,
                }));
                setDefaultRows(rows);

                // Check for date query param (coming from history "Edit" button)
                const params = new URLSearchParams(window.location.search);
                const dateParam = params.get('date');
                const initialDate = dateParam ?? format(addDays(new Date(), 1), 'yyyy-MM-dd');

                setDeliveryDate(initialDate);

                const check = canSubmitDailyOrder(parseISO(initialDate), setts, new Date());
                setCanSubmit(check.allowed);
                setCutoffMessage(check.message);

                await checkAndLoadExistingOrder(initialDate, rows);
            } catch (e) {
                setError('Failed to load data.');
            }
            setLoading(false);
        }
        loadData();
    }, []);

    async function checkAndLoadExistingOrder(date: string, fallbackRows: DailyRow[]) {
        const existing = await getMyDailyOrder(date);
        if (existing) {
            setExistingOrderId(existing.id);
            const seen = new Set<string>();
            const rows: DailyRow[] = ((existing.order_items ?? []) as any[])
                .filter((item: any) => {
                    if (seen.has(item.product_id)) return false;
                    seen.add(item.product_id);
                    return true;
                })
                .map((item: any) => ({
                    product_id: item.product_id,
                    product_name: item.product?.name ?? 'Unknown',
                    quantity: item.quantity,
                }));
            setOrderRows(rows);
        } else {
            setExistingOrderId(null);
            setOrderRows(fallbackRows.map((r) => ({ ...r, quantity: 0 })));
        }
    }

    async function handleDateChange(date: string) {
        setDeliveryDate(date);
        if (settings) {
            const check = canSubmitDailyOrder(parseISO(date), settings, new Date());
            setCanSubmit(check.allowed);
            setCutoffMessage(check.message);
        }
        try {
            await checkAndLoadExistingOrder(date, defaultRows);
        } catch {
            // fall back silently
        }
    }

    function updateQuantity(productId: string, value: number) {
        setOrderRows((prev) =>
            prev.map((row) =>
                row.product_id === productId ? { ...row, quantity: Math.max(0, value) } : row
            )
        );
    }

    function addProduct(product: Product) {
        if (orderRows.some((r) => r.product_id === product.id)) return;
        setOrderRows((prev) => [
            ...prev,
            { product_id: product.id, product_name: product.name, quantity: 0 },
        ]);
        setShowProductPicker(false);
    }

    function removeProduct(productId: string) {
        setOrderRows((prev) => prev.filter((r) => r.product_id !== productId));
    }

    function getTotal(): number {
        return orderRows.reduce((sum, r) => sum + r.quantity, 0);
    }

    function hasAnyQuantity(): boolean {
        return orderRows.some((r) => r.quantity > 0);
    }

    function isRowLocked(productId: string): boolean {
        if (!settings || !deliveryDate) return false;
        const prod = products.find((p) => p.id === productId);
        return isProductDayLocked(parseISO(deliveryDate), prod ?? {}, settings);
    }

    async function handleSubmit() {
        setSubmitting(true);
        setError('');

        let result;
        if (existingOrderId) {
            const items = orderRows
                .filter((r) => r.quantity > 0)
                .map((r) => ({ product_id: r.product_id, delivery_date: deliveryDate, quantity: r.quantity }));
            result = await editDailyOrder(existingOrderId, items);
        } else {
            const items = orderRows
                .filter((r) => r.quantity > 0)
                .map((r) => ({ product_id: r.product_id, quantity: r.quantity }));
            result = await submitDailyOrder(deliveryDate, items);
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
                        ? `Your daily order for ${deliveryDate && format(parseISO(deliveryDate), 'MMMM dd, yyyy')} has been updated.`
                        : `Your daily order for ${deliveryDate && format(parseISO(deliveryDate), 'MMMM dd, yyyy')} has been submitted.`
                    }
                </p>
                <a href="/dashboard" className="btn btn-primary">Back to Dashboard</a>
            </div>
        );
    }

    const availableToAdd = products
        .filter((p) => !orderRows.some((r) => r.product_id === p.id))
        .filter((p) => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()));

    return (
        <div className="animate-fade-in max-w-3xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <CalendarPlus size={24} className="text-success" />
                    Daily Order
                </h1>
                <p className="text-muted text-sm mt-1">Submit an order for a specific delivery date</p>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg badge-danger text-sm font-medium flex items-center gap-2 animate-fade-in">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            {/* Edit mode banner */}
            {existingOrderId && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-lg text-sm"
                    style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                    <Pencil size={14} className="flex-shrink-0" />
                    You are editing your existing order for this date.
                </div>
            )}

            {/* Date Selector */}
            <div className="card p-5 mb-6">
                <div className="form-group mb-0">
                    <label className="form-label">Delivery Date</label>
                    <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        min={existingOrderId ? undefined : format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                        className="form-input"
                        style={{ maxWidth: '250px' }}
                    />
                    <p className={`text-xs mt-1 ${canSubmit ? 'text-success' : 'text-danger'}`}>
                        {cutoffMessage}
                    </p>
                </div>
            </div>

            {/* Product List */}
            {(() => {
                const anyUnlocked = deliveryDate && settings
                    ? products.some(p => !isProductDayLocked(parseISO(deliveryDate), p, settings))
                    : canSubmit;
                const allProductsLocked = orderRows.length > 0 && orderRows.every(row => isRowLocked(row.product_id));
                return (existingOrderId || anyUnlocked) && (
                    <>
                        <div className="card mb-6">
                            <div className="p-4 border-b border-border">
                                <h3 className="font-semibold text-foreground">Products</h3>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th style={{ width: '140px' }}>Quantity</th>
                                        <th style={{ width: '60px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderRows.map((row) => {
                                        const locked = isRowLocked(row.product_id);
                                        return (
                                            <tr key={row.product_id}>
                                                <td className="font-medium">
                                                    {row.product_name}
                                                    {locked && (
                                                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-danger">
                                                            <Lock size={10} /> Locked
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={row.quantity || ''}
                                                        onChange={(e) =>
                                                            updateQuantity(row.product_id, parseInt(e.target.value) || 0)
                                                        }
                                                        placeholder={locked ? '—' : '0'}
                                                        disabled={locked}
                                                        className="form-input text-center py-1.5"
                                                        style={locked ? { width: '100px', background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' } : { width: '100px' }}
                                                    />
                                                </td>
                                                <td>
                                                    {!locked && (
                                                        <button
                                                            onClick={() => removeProduct(row.product_id)}
                                                            className="text-danger hover:bg-red-50 rounded p-1"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr style={{ background: '#f1f5f9' }}>
                                        <td className="font-bold">Total</td>
                                        <td className="font-bold text-primary text-center">{getTotal()}</td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Add Product */}
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
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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

                        {/* Submit */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted">
                                <Info size={14} />
                                {existingOrderId && allProductsLocked
                                    ? 'All products for this date are past their cutoff and cannot be modified.'
                                    : existingOrderId
                                        ? 'Locked products cannot be changed; others are still editable.'
                                        : 'Products past their cutoff are locked.'}
                            </div>
                            <button
                                onClick={() => setShowConfirmModal(true)}
                                disabled={!hasAnyQuantity() || (!!existingOrderId && allProductsLocked)}
                                className="btn btn-success"
                            >
                                <Check size={18} /> {existingOrderId ? 'Save Changes' : 'Review & Submit'}
                            </button>
                        </div>
                    </>
                );
            })()}

            {/* Confirm Modal */}
            {showConfirmModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3 className="text-xl font-bold mb-4">
                            {existingOrderId ? 'Confirm Order Changes' : 'Confirm Daily Order'}
                        </h3>
                        <p className="text-muted text-sm mb-4">
                            Delivery Date: <strong>{deliveryDate && format(parseISO(deliveryDate), 'MMMM dd, yyyy')}</strong>
                        </p>

                        <table className="data-table mb-4">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th className="text-center">Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderRows
                                    .filter((r) => r.quantity > 0)
                                    .map((r) => (
                                        <tr key={r.product_id}>
                                            <td className="font-medium">{r.product_name}</td>
                                            <td className="text-center font-bold">{r.quantity}</td>
                                        </tr>
                                    ))}
                                <tr style={{ background: '#f1f5f9' }}>
                                    <td className="font-bold">Total</td>
                                    <td className="text-center font-bold text-primary">{getTotal()}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowConfirmModal(false)} className="btn btn-ghost" disabled={submitting}>Cancel</button>
                            <button onClick={handleSubmit} disabled={submitting} className="btn btn-success">
                                {submitting ? (
                                    <><Loader2 className="animate-spin" size={16} /> {existingOrderId ? 'Saving...' : 'Submitting...'}</>
                                ) : (
                                    <><Check size={16} /> {existingOrderId ? 'Save Changes' : 'Confirm & Submit'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
