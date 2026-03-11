export const dynamic = 'force-dynamic';

import { getOrderForInvoice } from '@/actions/orders';
import { format, parseISO, addDays } from 'date-fns';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';
import '../invoice.css';

export async function generateMetadata({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await params;
    return { title: `Invoice No. ${orderId.slice(0, 8).toUpperCase()}` };
}

export default async function InvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await params;
    let order: Awaited<ReturnType<typeof getOrderForInvoice>>;
    try {
        order = await getOrderForInvoice(orderId);
    } catch {
        notFound();
    }

    const customer = order.customer as any;
    const items: any[] = (order.order_items ?? []).slice().sort((a: any, b: any) => {
        const dateDiff = a.delivery_date.localeCompare(b.delivery_date);
        if (dateDiff !== 0) return dateDiff;
        return (a.product?.name ?? '').localeCompare(b.product?.name ?? '');
    });

    const totalQty = items.reduce((sum: number, i: any) => sum + i.quantity, 0);

    const isWeekly = order.order_type === 'weekly';
    const dateLabel = isWeekly
        ? `${format(parseISO(order.week_start_date!), 'dd MMM yyyy')} – ${format(addDays(parseISO(order.week_start_date!), 6), 'dd MMM yyyy')}`
        : format(parseISO(order.delivery_date!), 'dd MMM yyyy');

    const invoiceNumber = order.id.slice(0, 8).toUpperCase();
    const poNumbers = [...new Set(items.map((i: any) => i.po_number).filter(Boolean))];

    // Split items into page-sized chunks so each printed page gets the full header
    const ROWS_PER_PAGE = 18;
    const pages: any[][] = [];
    for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
        pages.push(items.slice(i, i + ROWS_PER_PAGE));
    }
    if (pages.length === 0) pages.push([]);

    const renderHeader = () => (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.jpg" alt="St George Bakery" style={{ height: '90px', width: 'auto', display: 'block' }} />
                <div style={{ textAlign: 'right', fontSize: '13px', color: '#555', lineHeight: '1.9' }}>
                    <strong style={{ color: '#111', fontSize: '16px', display: 'block', fontWeight: 800 }}>Invoice No. {invoiceNumber}</strong>
                    {poNumbers.length > 0 && <span style={{ display: 'block', fontWeight: 600, color: '#333' }}>PO: {poNumbers.join(', ')}</span>}
                    {format(new Date(order.created_at), 'dd MMM yyyy')}<br />
                    <span style={{ textTransform: 'capitalize' }}>{order.order_type} Order Invoice</span>
                </div>
            </div>
            <div style={{ height: '2px', background: '#111', margin: '12px 0 16px' }}></div>
            <div style={{ display: 'flex', gap: '24px', lineHeight: '1.7', paddingBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', display: 'block', marginBottom: '6px' }}>Bill To</span>
                    <strong>{customer?.name}</strong><br />
                    {customer?.email}
                    {customer?.contact_number && <><br />{customer.contact_number}</>}
                    {customer?.delivery_address && <><br />{customer.delivery_address}</>}
                </div>
                <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', display: 'block', marginBottom: '6px' }}>Delivery Period</span>
                    {dateLabel}
                </div>
            </div>
        </>
    );

    return (
        <>
            <div className="inv-print-btn">
                <PrintButton />
            </div>

            <div className="invoice-wrap">
                {pages.map((pageItems, pageIdx) => (
                    <div key={pageIdx} className="inv-page">
                        {renderHeader()}

                        <table className="inv-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Delivery Date</th>
                                    <th>Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td>{item.product?.name ?? '—'}</td>
                                        <td>{format(parseISO(item.delivery_date), 'EEE dd MMM yyyy')}</td>
                                        <td className="right">{item.quantity}</td>
                                    </tr>
                                ))}
                                {pageIdx === pages.length - 1 && (
                                    <tr className="inv-total">
                                        <td colSpan={2}>Total Items</td>
                                        <td className="right">{totalQty}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {pageIdx === pages.length - 1 && (
                            <div className="inv-footer">
                                Thank you for your order — St. George Bakery, London
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}
