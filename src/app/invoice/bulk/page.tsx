export const dynamic = 'force-dynamic';

import { getBulkOrdersForInvoice } from '@/actions/orders';
import { format, parseISO, addDays } from 'date-fns';
import PrintButton from '@/app/invoice/[orderId]/PrintButton';
import '../invoice.css';

export const metadata = { title: 'Bulk Invoices' };

export default async function BulkInvoicePage({
    searchParams,
}: {
    searchParams: Promise<{ from: string; to: string }>;
}) {
    const { from, to } = await searchParams;
    const orders = await getBulkOrdersForInvoice(from, to);

    const ROWS_PER_PAGE = 18;

    // Pre-compute all page sections to avoid flatMap inside JSX (causes hydration issues)
    const allSections: { key: string; order: any; customer: any; invoiceNumber: string; dateLabel: string; pageItems: any[]; pageIdx: number; totalPages: number; totalQty: number }[] = [];
    for (const order of orders) {
        const customer = order.customer as any;
        const items: any[] = (order.order_items ?? []).slice().sort((a: any, b: any) => {
            const d = a.delivery_date.localeCompare(b.delivery_date);
            return d !== 0 ? d : (a.product?.name ?? '').localeCompare(b.product?.name ?? '');
        });
        const totalQty = items.reduce((sum: number, i: any) => sum + i.quantity, 0);
        const isWeekly = order.order_type === 'weekly';
        const dateLabel = isWeekly
            ? `${format(parseISO(order.week_start_date), 'dd MMM yyyy')} – ${format(addDays(parseISO(order.week_start_date), 6), 'dd MMM yyyy')}`
            : format(parseISO(order.delivery_date), 'dd MMM yyyy');
        const invoiceNumber = order.id.slice(0, 8).toUpperCase();

        const pages: any[][] = [];
        for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
            pages.push(items.slice(i, i + ROWS_PER_PAGE));
        }
        if (pages.length === 0) pages.push([]);

        for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
            allSections.push({
                key: `${order.id}-${pageIdx}`,
                order,
                customer,
                invoiceNumber,
                dateLabel,
                pageItems: pages[pageIdx],
                pageIdx,
                totalPages: pages.length,
                totalQty,
            });
        }
    }

    return (
        <>
            <div className="inv-print-btn">
                <PrintButton />
            </div>
            <div className="inv-summary">
                {orders.length} invoice(s) &mdash; {from} to {to}
            </div>

            <div className="invoice-wrap">
                {allSections.map((sec) => (
                    <div key={sec.key} className="inv-page">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logo.jpg" alt="St George Bakery" style={{ height: '90px', width: 'auto', display: 'block' }} />
                            <div style={{ textAlign: 'right', fontSize: '13px', color: '#555', lineHeight: '1.9' }}>
                                <strong style={{ color: '#111', fontSize: '16px', display: 'block', fontWeight: 800 }}>PO {sec.invoiceNumber}</strong>
                                {format(new Date(sec.order.created_at), 'dd MMM yyyy')}<br />
                                <span style={{ textTransform: 'capitalize' }}>{sec.order.order_type} Order Invoice</span>
                            </div>
                        </div>
                        <div style={{ height: '2px', background: '#111', margin: '12px 0 16px' }}></div>
                        <div style={{ display: 'flex', gap: '24px', lineHeight: '1.7', paddingBottom: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', display: 'block', marginBottom: '6px' }}>Bill To</span>
                                <strong>{sec.customer?.name}</strong><br />
                                {sec.customer?.email}
                                {sec.customer?.contact_number && <><br />{sec.customer.contact_number}</>}
                                {sec.customer?.delivery_address && <><br />{sec.customer.delivery_address}</>}
                            </div>
                            <div>
                                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', display: 'block', marginBottom: '6px' }}>Delivery Period</span>
                                {sec.dateLabel}
                            </div>
                        </div>

                        <table className="inv-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Delivery Date</th>
                                    <th>Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sec.pageItems.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td>{item.product?.name ?? '—'}</td>
                                        <td>{format(parseISO(item.delivery_date), 'EEE dd MMM yyyy')}</td>
                                        <td className="right">{item.quantity}</td>
                                    </tr>
                                ))}
                                {sec.pageIdx === sec.totalPages - 1 && (
                                    <tr className="inv-total">
                                        <td colSpan={2}>Total Items</td>
                                        <td className="right">{sec.totalQty}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {sec.pageIdx === sec.totalPages - 1 && (
                            <div className="inv-footer">
                                Thank you for your order — St. George Bakery, London
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {orders.length === 0 && (
                <div style={{ maxWidth: 780, margin: '60px auto', padding: '0 32px', textAlign: 'center', color: '#888', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                    No orders found for {from} – {to}
                </div>
            )}
        </>
    );
}
