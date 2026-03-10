export const dynamic = 'force-dynamic';

import { getOrderForInvoice } from '@/actions/orders';
import { format, parseISO, addDays } from 'date-fns';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';

export async function generateMetadata({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await params;
    return { title: `Invoice PO ${orderId.slice(0, 8).toUpperCase()}` };
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
                    <strong style={{ color: '#111', fontSize: '16px', display: 'block', fontWeight: 800 }}>PO {invoiceNumber}</strong>
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
            {/* eslint-disable-next-line react/no-danger */}
            <style dangerouslySetInnerHTML={{ __html: `
                body { background: #fff !important; }
                .invoice-wrap { max-width: 780px; margin: 0 auto; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; font-size: 14px; }
                .inv-page { padding: 40px 32px; }
                .inv-page + .inv-page { page-break-before: always; break-before: page; }
                .inv-table { width: 100%; border-collapse: collapse; }
                .inv-table thead th { background: #111; color: #fff; padding: 10px 14px; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600; border: none; text-align: left; }
                .inv-table thead th:last-child { text-align: right; }
                .inv-table tbody tr:nth-child(even) { background: #f7f7f7; }
                .inv-table tbody td { padding: 9px 14px; font-size: 13px; border-bottom: 1px solid #eee; }
                .inv-table tbody td.right { text-align: right; font-weight: 600; }
                .inv-total td { padding: 12px 14px; font-weight: 700; font-size: 14px; border-top: 2px solid #111 !important; border-bottom: none; background: #fff !important; }
                .inv-footer { margin-top: 48px; font-size: 12px; color: #aaa; text-align: center; }
                .inv-print-btn { max-width: 780px; margin: 0 auto; padding: 24px 32px 0; }
                @media print { .inv-print-btn { display: none !important; } }
                @media screen { .inv-page + .inv-page { border-top: 1px dashed #ddd; } }
            ` }} />

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
