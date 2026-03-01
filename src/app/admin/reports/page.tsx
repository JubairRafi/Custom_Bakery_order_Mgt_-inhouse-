'use client';

import { useState, useEffect } from 'react';
import { getProductionSummary } from '@/actions/orders';
import { BarChart3, Download, Loader2, CalendarDays, Filter } from 'lucide-react';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ReportsPage() {
    const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
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
    const [loading, setLoading] = useState(false);

    // Load daily summary
    useEffect(() => {
        if (viewMode === 'daily') {
            loadDailySummary(selectedDate);
        }
    }, [selectedDate, viewMode]);

    // Load weekly summary
    useEffect(() => {
        if (viewMode === 'weekly') {
            loadWeeklySummary(weekStartDate);
        }
    }, [weekStartDate, viewMode]);

    async function loadDailySummary(date: string) {
        setLoading(true);
        const data = await getProductionSummary(date);
        setSummary(data);
        setLoading(false);
    }

    async function loadWeeklySummary(mondayStr: string) {
        setLoading(true);
        const monday = parseISO(mondayStr);
        const days = Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'yyyy-MM-dd'));

        const results = await Promise.all(
            days.map((date) => getProductionSummary(date).then((data) => ({ date, data })))
        );

        // Collect all product names
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

        const dayTotals = results.map((r) =>
            r.data.reduce((sum: number, d: any) => sum + d.total_quantity, 0)
        );

        setWeeklySummary({
            days,
            products,
            dayTotals,
            grandTotal: dayTotals.reduce((s, t) => s + t, 0),
        });
        setLoading(false);
    }

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
        const headers = ['Product', ...weeklySummary.days.map((d, i) => format(parseISO(d), 'EEE dd/MM')), 'Total'];
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

    function shiftWeek(offset: number) {
        const current = parseISO(weekStartDate);
        setWeekStartDate(format(addDays(current, offset * 7), 'yyyy-MM-dd'));
    }

    const grandTotal = summary.reduce((sum, s) => sum + s.total_quantity, 0);

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
                    {viewMode === 'daily' ? (
                        <button onClick={exportDailyExcel} className="btn btn-primary btn-sm" disabled={summary.length === 0}>
                            <Download size={14} /> Export Daily
                        </button>
                    ) : (
                        <button onClick={exportWeeklyExcel} className="btn btn-primary btn-sm" disabled={!weeklySummary?.products.length}>
                            <Download size={14} /> Export Weekly
                        </button>
                    )}
                </div>
            </div>

            {/* View Mode Toggle + Filters */}
            <div className="card p-5 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex rounded-lg overflow-hidden border border-border" style={{ width: 'fit-content' }}>
                        <button
                            onClick={() => setViewMode('daily')}
                            className={`px-4 py-2 text-sm font-semibold transition-all ${viewMode === 'daily' ? 'bg-primary text-white' : 'bg-surface text-muted hover:bg-gray-100'}`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setViewMode('weekly')}
                            className={`px-4 py-2 text-sm font-semibold transition-all ${viewMode === 'weekly' ? 'bg-primary text-white' : 'bg-surface text-muted hover:bg-gray-100'}`}
                        >
                            Weekly
                        </button>
                    </div>

                    {viewMode === 'daily' ? (
                        /* Daily date picker */
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
                        </div>
                    ) : (
                        /* Weekly navigation */
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
                                className="btn btn-outline btn-sm ml-auto"
                            >
                                This Week
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="card">
                {viewMode === 'daily' ? (
                    /* Daily Summary */
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
                ) : (
                    /* Weekly Summary Grid */
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
            </div>
        </div>
    );
}
