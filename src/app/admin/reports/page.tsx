'use client';

import { useState, useEffect } from 'react';
import { getProductionSummary, getCustomerWiseReport, getWholesaleReport } from '@/actions/orders';
import { getCustomers } from '@/actions/users';
import { BarChart3, Download, Loader2, CalendarDays, Users, List } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ReportsPage() {
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'customer' | 'wholesale'>('daily');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [weekStartDate, setWeekStartDate] = useState(() => {
        const now = new Date();
        const day = now.getDay();
        const monday = addDays(now, day === 0 ? -6 : 1 - day);
        return format(monday, 'yyyy-MM-dd');
    });
    const [summary, setSummary] = useState<any[]>([]);
    const [weeklySummary, setWeeklySummary] = useState<{
        days: string[];
        products: { name: string; quantities: number[]; total: number }[];
        dayTotals: number[];
        grandTotal: number;
    } | null>(null);
    const [customerReport, setCustomerReport] = useState<{
        customers: { id: string; name: string }[];
        products: { id: string; name: string }[];
        grid: { [customerId: string]: { [productId: string]: number } };
    } | null>(null);
    const [custStartDate, setCustStartDate] = useState(() => {
        const now = new Date();
        const day = now.getDay();
        const monday = addDays(now, day === 0 ? -6 : 1 - day);
        return format(monday, 'yyyy-MM-dd');
    });
    const [custEndDate, setCustEndDate] = useState(() => {
        const now = new Date();
        const day = now.getDay();
        const sunday = addDays(now, day === 0 ? 0 : 7 - day);
        return format(sunday, 'yyyy-MM-dd');
    });
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
    const [filterCustomer, setFilterCustomer] = useState('');
    const [wholesaleDate, setWholesaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [wholesaleData, setWholesaleData] = useState<{ customer_name: string; products: { product_name: string; quantity: number }[] }[]>([]);

    // Load customers for filter dropdown
    useEffect(() => {
        getCustomers().then((data: any[]) => setCustomers(data.map((c: any) => ({ id: c.id, name: c.name }))));
    }, []);

    // Load daily summary
    useEffect(() => {
        if (viewMode === 'daily') loadDailySummary(selectedDate, filterCustomer || undefined);
    }, [selectedDate, viewMode, filterCustomer]);

    // Load weekly summary
    useEffect(() => {
        if (viewMode === 'weekly') loadWeeklySummary(weekStartDate, filterCustomer || undefined);
    }, [weekStartDate, viewMode, filterCustomer]);

    // Load customer report
    useEffect(() => {
        if (viewMode === 'customer') loadCustomerReport();
    }, [custStartDate, custEndDate, viewMode]);

    // Load wholesale report
    useEffect(() => {
        if (viewMode === 'wholesale') loadWholesaleReport(wholesaleDate);
    }, [wholesaleDate, viewMode]);

    async function loadDailySummary(date: string, customerId?: string) {
        setLoading(true);
        const data = await getProductionSummary(date, customerId);
        setSummary(data);
        setLoading(false);
    }

    async function loadWeeklySummary(mondayStr: string, customerId?: string) {
        setLoading(true);
        const monday = parseISO(mondayStr);
        const days = Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'yyyy-MM-dd'));
        const results = await Promise.all(
            days.map((date) => getProductionSummary(date, customerId).then((data) => ({ date, data })))
        );
        const allProducts = new Set<string>();
        results.forEach((r) => r.data.forEach((d: any) => allProducts.add(d.product_name)));
        const products: { name: string; quantities: number[]; total: number }[] = [];
        for (const name of Array.from(allProducts).sort()) {
            const quantities = results.map((r) => {
                const item = r.data.find((d: any) => d.product_name === name);
                return item?.total_quantity || 0;
            });
            products.push({ name, quantities, total: quantities.reduce((s, q) => s + q, 0) });
        }
        const dayTotals = results.map((r) => r.data.reduce((sum: number, d: any) => sum + d.total_quantity, 0));
        setWeeklySummary({ days, products, dayTotals, grandTotal: dayTotals.reduce((s, t) => s + t, 0) });
        setLoading(false);
    }

    async function loadCustomerReport() {
        setLoading(true);
        const data = await getCustomerWiseReport(custStartDate, custEndDate);
        setCustomerReport(data);
        setLoading(false);
    }

    async function loadWholesaleReport(date: string) {
        setLoading(true);
        const data = await getWholesaleReport(date);
        setWholesaleData(data);
        setLoading(false);
    }

    // ─── Export Functions ───────────────────────────────────

    function exportDailyExcel() {
        if (summary.length === 0) return;
        const wsData = [
            [`Production Summary — ${format(new Date(selectedDate), 'MMMM dd, yyyy')}`],
            [],
            ['Product', 'Total Quantity'],
            ...summary.map((s) => [s.product_name, s.total_quantity]),
            [],
            ['Grand Total', summary.reduce((sum, s) => sum + s.total_quantity, 0)],
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 30 }, { wch: 15 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Production Summary');
        XLSX.writeFile(wb, `production_summary_${selectedDate}.xlsx`);
    }

    function exportWeeklyExcel() {
        if (!weeklySummary) return;
        const monday = parseISO(weekStartDate);
        const headers = ['Product', ...weeklySummary.days.map((d) => format(parseISO(d), 'EEE dd/MM')), 'Total'];
        const rows = weeklySummary.products.map((p) => [p.name, ...p.quantities, p.total]);
        const totalsRow = ['TOTAL', ...weeklySummary.dayTotals, weeklySummary.grandTotal];
        const wsData = [
            [`Weekly Production Report — Week of ${format(monday, 'MMMM dd, yyyy')}`],
            [],
            headers,
            ...rows,
            totalsRow,
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 30 }, ...Array(8).fill({ wch: 12 })];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Weekly Summary');
        XLSX.writeFile(wb, `weekly_report_${weekStartDate}.xlsx`);
    }

    function exportCustomerExcel() {
        if (!customerReport || customerReport.customers.length === 0) return;
        const headers = ['Customer', ...customerReport.products.map((p) => p.name), 'Total'];
        const rows = customerReport.customers.map((c) => {
            const productTotals = customerReport.products.map((p) => customerReport.grid[c.id]?.[p.id] || 0);
            const total = productTotals.reduce((s, q) => s + q, 0);
            return [c.name, ...productTotals, total];
        });

        // Product totals row
        const productTotalsRow: (string | number)[] = ['TOTAL'];
        let grandTotal = 0;
        for (const p of customerReport.products) {
            const colTotal = customerReport.customers.reduce(
                (sum, c) => sum + (customerReport.grid[c.id]?.[p.id] || 0), 0
            );
            productTotalsRow.push(colTotal);
            grandTotal += colTotal;
        }
        productTotalsRow.push(grandTotal);

        const wsData = [
            [`Customer-Wise Report — ${format(parseISO(custStartDate), 'MMM dd')} to ${format(parseISO(custEndDate), 'MMM dd, yyyy')}`],
            [],
            headers,
            ...rows,
            productTotalsRow,
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 25 }, ...Array(customerReport.products.length + 1).fill({ wch: 14 })];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customer Report');
        XLSX.writeFile(wb, `customer_report_${custStartDate}_to_${custEndDate}.xlsx`);
    }

    function shiftWeek(offset: number) {
        const current = parseISO(weekStartDate);
        setWeekStartDate(format(addDays(current, offset * 7), 'yyyy-MM-dd'));
    }

    function setCustomerWeekPreset() {
        const now = new Date();
        const day = now.getDay();
        const monday = addDays(now, day === 0 ? -6 : 1 - day);
        const sunday = addDays(monday, 6);
        setCustStartDate(format(monday, 'yyyy-MM-dd'));
        setCustEndDate(format(sunday, 'yyyy-MM-dd'));
    }

    function setCustomerMonthPreset() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setCustStartDate(format(firstDay, 'yyyy-MM-dd'));
        setCustEndDate(format(lastDay, 'yyyy-MM-dd'));
    }

    const grandTotal = summary.reduce((sum, s) => sum + s.total_quantity, 0);

    // Get export button based on mode
    function getExportButton() {
        if (viewMode === 'daily') {
            return (
                <button onClick={exportDailyExcel} className="btn btn-primary btn-sm" disabled={summary.length === 0}>
                    <Download size={14} /> Export Daily
                </button>
            );
        } else if (viewMode === 'weekly') {
            return (
                <button onClick={exportWeeklyExcel} className="btn btn-primary btn-sm" disabled={!weeklySummary?.products.length}>
                    <Download size={14} /> Export Weekly
                </button>
            );
        } else if (viewMode === 'wholesale') {
            return (
                <button onClick={exportWholesaleExcel} className="btn btn-primary btn-sm" disabled={wholesaleData.length === 0}>
                    <Download size={14} /> Export Wholesale
                </button>
            );
        } else {
            return (
                <button onClick={exportCustomerExcel} className="btn btn-primary btn-sm" disabled={!customerReport?.customers.length}>
                    <Download size={14} /> Export Customer Report
                </button>
            );
        }
    }

    function exportWholesaleExcel() {
        if (wholesaleData.length === 0) return;
        const wsData: any[][] = [
            ['Wholesale — ' + format(parseISO(wholesaleDate), 'EEEE, MMMM dd, yyyy')],
            [],
            ['Customer / Product', 'Quantity'],
        ];
        for (const group of wholesaleData) {
            wsData.push([group.customer_name.toUpperCase(), '']);
            for (const p of group.products) {
                wsData.push([p.product_name, p.quantity]);
            }
            wsData.push([]);
        }
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 35 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Wholesale');
        XLSX.writeFile(wb, `wholesale_${wholesaleDate}.xlsx`);
    }

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <BarChart3 size={24} className="text-primary" />
                        Production Reports
                    </h1>
                    <p className="text-muted text-sm mt-1">View and export production summaries</p>
                </div>
                <div className="flex items-center gap-3">
                    {getExportButton()}
                </div>
            </div>

            {/* View Mode Toggle + Filters */}
            <div className="card p-5 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex rounded-lg overflow-hidden border border-border" style={{ width: 'fit-content' }}>
                        {(['daily', 'weekly', 'customer', 'wholesale'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-2 text-sm font-semibold transition-all ${viewMode === mode ? 'bg-primary text-white' : 'bg-surface text-muted hover:bg-gray-100'}`}
                            >
                                {mode === 'customer' ? 'Customer' : mode === 'wholesale' ? 'Wholesale' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>

                    {viewMode === 'daily' && (
                        <div className="flex items-center gap-4 flex-1">
                            <CalendarDays size={18} className="text-primary" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="form-input py-2 text-sm"
                                style={{ maxWidth: '200px' }}
                            />
                            <div className="flex gap-2 ml-auto flex-wrap">
                                {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                                    const date = format(addDays(new Date(), offset), 'yyyy-MM-dd');
                                    const isActive = date === selectedDate;
                                    return (
                                        <button
                                            key={offset}
                                            onClick={() => setSelectedDate(date)}
                                            className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                                            style={{ minWidth: 'auto', padding: '4px 10px' }}
                                        >
                                            {offset === 0 ? 'Today' : format(addDays(new Date(), offset), 'EEE')}
                                        </button>
                                    );
                                })}
                            </div>
                            <select
                                value={filterCustomer}
                                onChange={(e) => setFilterCustomer(e.target.value)}
                                className="form-input py-2 text-sm"
                                style={{ minWidth: '180px' }}
                            >
                                <option value="">All Customers</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {viewMode === 'weekly' && (
                        <div className="flex items-center gap-4 flex-1">
                            <CalendarDays size={18} className="text-primary" />
                            <button onClick={() => shiftWeek(-1)} className="btn btn-ghost btn-sm">&larr; Prev</button>
                            <span className="font-semibold text-sm">
                                Week of {format(parseISO(weekStartDate), 'MMM dd, yyyy')}
                            </span>
                            <button onClick={() => shiftWeek(1)} className="btn btn-ghost btn-sm">Next &rarr;</button>
                            <button
                                onClick={() => {
                                    const now = new Date();
                                    const day = now.getDay();
                                    setWeekStartDate(format(addDays(now, day === 0 ? -6 : 1 - day), 'yyyy-MM-dd'));
                                }}
                                className="btn btn-outline btn-sm"
                            >
                                This Week
                            </button>
                            <select
                                value={filterCustomer}
                                onChange={(e) => setFilterCustomer(e.target.value)}
                                className="form-input py-2 text-sm ml-auto"
                                style={{ minWidth: '180px' }}
                            >
                                <option value="">All Customers</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {viewMode === 'customer' && (
                        <div className="flex items-center gap-4 flex-1 flex-wrap">
                            <Users size={18} className="text-primary" />
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-muted">From:</label>
                                <input
                                    type="date"
                                    value={custStartDate}
                                    onChange={(e) => setCustStartDate(e.target.value)}
                                    className="form-input py-2 text-sm"
                                    style={{ maxWidth: '170px' }}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-muted">To:</label>
                                <input
                                    type="date"
                                    value={custEndDate}
                                    onChange={(e) => setCustEndDate(e.target.value)}
                                    className="form-input py-2 text-sm"
                                    style={{ maxWidth: '170px' }}
                                />
                            </div>
                            <div className="flex gap-2 ml-auto">
                                <button onClick={setCustomerWeekPreset} className="btn btn-ghost btn-sm">This Week</button>
                                <button onClick={setCustomerMonthPreset} className="btn btn-ghost btn-sm">This Month</button>
                            </div>
                        </div>
                    )}

                    {viewMode === 'wholesale' && (
                        <div className="flex items-center gap-4 flex-1">
                            <List size={18} className="text-primary" />
                            <input
                                type="date"
                                value={wholesaleDate}
                                onChange={(e) => setWholesaleDate(e.target.value)}
                                className="form-input py-2 text-sm"
                                style={{ maxWidth: '200px' }}
                            />
                            <div className="flex gap-2 ml-auto flex-wrap">
                                {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                                    const d = format(addDays(new Date(), offset), 'yyyy-MM-dd');
                                    return (
                                        <button key={offset} onClick={() => setWholesaleDate(d)}
                                            className={`btn btn-sm ${d === wholesaleDate ? 'btn-primary' : 'btn-ghost'}`}
                                            style={{ minWidth: 'auto', padding: '4px 10px' }}
                                        >
                                            {offset === 0 ? 'Today' : format(addDays(new Date(), offset), 'EEE')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="card">
                {viewMode === 'wholesale' && (
                    <>
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-bold text-foreground">
                                Wholesale — {format(parseISO(wholesaleDate), 'EEEE, MMMM dd, yyyy')}
                            </h3>
                            <span className="text-xs text-muted">{wholesaleData.length} customers</span>
                        </div>
                        {loading ? (
                            <div className="p-12 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={32} /></div>
                        ) : wholesaleData.length > 0 ? (
                            <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Restaurant / Order</th>
                                            <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600, width: '90px' }}>Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {wholesaleData.map((group, gi) => (
                                            <>
                                                {/* Customer heading row */}
                                                <tr key={`h-${gi}`}>
                                                    <td colSpan={2} style={{
                                                        padding: '10px 12px 4px',
                                                        fontWeight: 700,
                                                        color: '#dc2626',
                                                        fontSize: '0.9rem',
                                                        borderTop: gi > 0 ? '12px solid #f8fafc' : undefined,
                                                    }}>
                                                        {group.customer_name}
                                                    </td>
                                                </tr>
                                                {/* Product rows */}
                                                {group.products.map((p, pi) => (
                                                    <tr key={`p-${gi}-${pi}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '5px 12px 5px 20px', color: '#374151' }}>{p.product_name}</td>
                                                        <td style={{ textAlign: 'center', padding: '5px 12px' }}>
                                                            {p.quantity > 0 ? (
                                                                <span style={{
                                                                    background: '#dc2626',
                                                                    color: 'white',
                                                                    fontWeight: 700,
                                                                    padding: '2px 10px',
                                                                    borderRadius: '3px',
                                                                    display: 'inline-block',
                                                                    minWidth: '36px',
                                                                }}>{p.quantity}</span>
                                                            ) : (
                                                                <span style={{ color: '#9ca3af' }}>0</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-muted">
                                <List size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No wholesale data</p>
                                <p className="text-sm">No orders found for this date.</p>
                            </div>
                        )}
                    </>
                )}

                {viewMode === 'daily' && (
                    <>
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold text-foreground">
                                Production Summary — {format(new Date(selectedDate), 'EEEE, MMMM dd, yyyy')}
                            </h3>
                        </div>
                        {loading ? (
                            <div className="p-12 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={32} /></div>
                        ) : summary.length > 0 ? (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th className="text-center" style={{ width: '150px' }}>Total Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.map((s, i) => (
                                        <tr key={i}>
                                            <td className="font-medium">{s.product_name}</td>
                                            <td className="text-center">
                                                <span className="font-bold text-lg text-primary">{s.total_quantity}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: '#f1f5f9' }}>
                                        <td className="font-bold text-lg">Grand Total</td>
                                        <td className="text-center">
                                            <span className="font-bold text-xl" style={{ color: 'var(--primary-dark)' }}>{grandTotal}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center text-muted">
                                <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No production data</p>
                                <p className="text-sm">No orders found for this date.</p>
                            </div>
                        )}
                    </>
                )}

                {viewMode === 'weekly' && (
                    <>
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold text-foreground">
                                Weekly Production — Week of {format(parseISO(weekStartDate), 'MMMM dd, yyyy')}
                            </h3>
                        </div>
                        {loading ? (
                            <div className="p-12 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={32} /></div>
                        ) : weeklySummary && weeklySummary.products.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: '160px' }}>Product</th>
                                            {weeklySummary.days.map((day, i) => (
                                                <th key={day} className="text-center" style={{ minWidth: '70px' }}>
                                                    <div>{DAY_LABELS[i]}</div>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.7 }}>
                                                        {format(parseISO(day), 'dd/MM')}
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="text-center" style={{ minWidth: '70px', background: '#f1f5f9' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {weeklySummary.products.map((product, i) => (
                                            <tr key={i}>
                                                <td className="font-medium">{product.name}</td>
                                                {product.quantities.map((qty, j) => (
                                                    <td key={j} className="text-center">
                                                        {qty > 0 ? (
                                                            <span className="font-bold text-primary">{qty}</span>
                                                        ) : (
                                                            <span className="text-gray-300">—</span>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="text-center font-bold" style={{ background: '#f1f5f9' }}>{product.total}</td>
                                            </tr>
                                        ))}
                                        <tr style={{ background: '#e2e8f0' }}>
                                            <td className="font-bold">TOTAL</td>
                                            {weeklySummary.dayTotals.map((total, i) => (
                                                <td key={i} className="text-center font-bold">{total || '—'}</td>
                                            ))}
                                            <td className="text-center font-bold text-lg" style={{ background: '#cbd5e1', color: 'var(--primary-dark)' }}>
                                                {weeklySummary.grandTotal}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-muted">
                                <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No production data</p>
                                <p className="text-sm">No orders found for this week.</p>
                            </div>
                        )}
                    </>
                )}

                {viewMode === 'customer' && (
                    <>
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold text-foreground">
                                Customer-Wise Report — {format(parseISO(custStartDate), 'MMM dd')} to {format(parseISO(custEndDate), 'MMM dd, yyyy')}
                            </h3>
                            <p className="text-xs text-muted mt-1">
                                Rows = Customers · Columns = Products · Values = Total quantities ordered
                            </p>
                        </div>
                        {loading ? (
                            <div className="p-12 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={32} /></div>
                        ) : customerReport && customerReport.customers.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: '150px', position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>
                                                Customer
                                            </th>
                                            {customerReport.products.map((p) => (
                                                <th key={p.id} className="text-center" style={{ minWidth: '80px' }}>
                                                    <div style={{ fontSize: '0.75rem', lineHeight: 1.3 }}>{p.name}</div>
                                                </th>
                                            ))}
                                            <th className="text-center" style={{ minWidth: '70px', background: '#f1f5f9' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerReport.customers.map((customer) => {
                                            const rowTotal = customerReport.products.reduce(
                                                (sum, p) => sum + (customerReport.grid[customer.id]?.[p.id] || 0), 0
                                            );
                                            return (
                                                <tr key={customer.id}>
                                                    <td className="font-medium" style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>
                                                        {customer.name}
                                                    </td>
                                                    {customerReport.products.map((p) => {
                                                        const qty = customerReport.grid[customer.id]?.[p.id] || 0;
                                                        return (
                                                            <td key={p.id} className="text-center">
                                                                {qty > 0 ? (
                                                                    <span className="font-bold text-primary">{qty}</span>
                                                                ) : (
                                                                    <span className="text-gray-300">—</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="text-center font-bold" style={{ background: '#f1f5f9' }}>{rowTotal}</td>
                                                </tr>
                                            );
                                        })}
                                        {/* Product totals row */}
                                        <tr style={{ background: '#e2e8f0' }}>
                                            <td className="font-bold" style={{ position: 'sticky', left: 0, background: '#e2e8f0', zIndex: 1 }}>
                                                TOTAL
                                            </td>
                                            {customerReport.products.map((p) => {
                                                const colTotal = customerReport.customers.reduce(
                                                    (sum, c) => sum + (customerReport.grid[c.id]?.[p.id] || 0), 0
                                                );
                                                return (
                                                    <td key={p.id} className="text-center font-bold">{colTotal || '—'}</td>
                                                );
                                            })}
                                            <td className="text-center font-bold text-lg" style={{ background: '#cbd5e1', color: 'var(--primary-dark)' }}>
                                                {customerReport.customers.reduce((sum, c) =>
                                                    sum + customerReport.products.reduce(
                                                        (s, p) => s + (customerReport.grid[c.id]?.[p.id] || 0), 0
                                                    ), 0
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-muted">
                                <Users size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No customer data</p>
                                <p className="text-sm">No orders found for this date range.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
