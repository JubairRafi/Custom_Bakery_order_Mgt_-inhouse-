'use client';

import { useState, useEffect } from 'react';
import { getProductionSummary } from '@/actions/orders';
import { BarChart3, Download, Loader2, CalendarDays } from 'lucide-react';
import { format, addDays } from 'date-fns';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [summary, setSummary] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSummary(selectedDate);
    }, [selectedDate]);

    async function loadSummary(date: string) {
        setLoading(true);
        const data = await getProductionSummary(date);
        setSummary(data);
        setLoading(false);
    }

    function exportToExcel() {
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

        // Set column widths
        ws['!cols'] = [{ wch: 30 }, { wch: 15 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Production Summary');
        XLSX.writeFile(wb, `production_summary_${selectedDate}.xlsx`);
    }

    function exportWeeklySummary() {
        // Generate a weekly summary for the week containing the selected date
        const startDate = new Date(selectedDate);
        const dayOfWeek = startDate.getDay();
        const monday = addDays(startDate, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);

        const promises = Array.from({ length: 7 }, (_, i) => {
            const date = format(addDays(monday, i), 'yyyy-MM-dd');
            return getProductionSummary(date).then((data) => ({ date, data }));
        });

        Promise.all(promises).then((results) => {
            const allProducts = new Set<string>();
            results.forEach((r) => r.data.forEach((d: any) => allProducts.add(d.product_name)));

            const headers = ['Product', ...results.map((r) => format(new Date(r.date), 'EEE dd/MM')), 'Total'];
            const rows: any[][] = [];

            for (const product of Array.from(allProducts).sort()) {
                const row: (string | number)[] = [product];
                let rowTotal = 0;
                for (const result of results) {
                    const item = result.data.find((d: any) => d.product_name === product);
                    const qty = item?.total_quantity || 0;
                    row.push(qty);
                    rowTotal += qty;
                }
                row.push(rowTotal);
                rows.push(row);
            }

            // Add totals row
            const totalsRow: (string | number)[] = ['TOTAL'];
            let grandTotal = 0;
            for (const result of results) {
                const dayTotal = result.data.reduce((sum: number, d: any) => sum + d.total_quantity, 0);
                totalsRow.push(dayTotal);
                grandTotal += dayTotal;
            }
            totalsRow.push(grandTotal);
            rows.push(totalsRow);

            const wsData = [
                [`Weekly Production Report — Week of ${format(monday, 'MMMM dd, yyyy')}`],
                [],
                headers,
                ...rows,
            ];

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{ wch: 30 }, ...Array(8).fill({ wch: 12 })];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Weekly Summary');
            XLSX.writeFile(wb, `weekly_report_${format(monday, 'yyyy-MM-dd')}.xlsx`);
        });
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
                    <button onClick={exportToExcel} className="btn btn-outline btn-sm" disabled={summary.length === 0}>
                        <Download size={14} /> Export Daily
                    </button>
                    <button onClick={exportWeeklySummary} className="btn btn-primary btn-sm">
                        <Download size={14} /> Export Weekly
                    </button>
                </div>
            </div>

            {/* Date Picker */}
            <div className="card p-5 mb-6">
                <div className="flex items-center gap-4">
                    <CalendarDays size={18} className="text-primary" />
                    <label className="text-sm font-semibold">Select Date:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="form-input py-2 text-sm"
                        style={{ maxWidth: '200px' }}
                    />
                    <div className="flex gap-2 ml-auto">
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
            </div>

            {/* Summary Table */}
            <div className="card">
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
                                    <span className="font-bold text-xl" style={{ color: 'var(--primary-dark)' }}>
                                        {grandTotal}
                                    </span>
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
            </div>
        </div>
    );
}
