export const dynamic = 'force-dynamic';

import { getOrderForInvoice } from '@/actions/orders';
import { format, parseISO, addDays } from 'date-fns';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';

export async function generateMetadata({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await params;
    return { title: `Invoice #${orderId.slice(0, 8).toUpperCase()}` };
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

    return (
        <>
            <style>{`
                body { background: #fff !important; }
                .invoice-wrap { max-width: 780px; margin: 0 auto; padding: 40px 32px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; font-size: 14px; }
                .invoice-wrap img { display: block; margin: 0; }
                .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
                .inv-bakery-name { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
                .inv-label { font-size: 12px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
                .inv-meta { text-align: right; font-size: 13px; color: #555; line-height: 1.9; }
                .inv-meta strong { color: #111; font-size: 16px; display: block; }
                .inv-divider { border: none; border-top: 2px solid #111; margin: 20px 0 28px; }
                .inv-info { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
                .inv-info-section h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 6px; }
                .inv-info-section p { line-height: 1.7; }
                .inv-table { width: 100%; border-collapse: collapse; }
                .inv-table thead { background: #111; color: #fff; }
                .inv-table thead th { padding: 10px 14px; text-align: left; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; }
                .inv-table thead th.right { text-align: right; }
                .inv-table tbody tr:nth-child(even) { background: #f7f7f7; }
                .inv-table tbody td { padding: 9px 14px; font-size: 13px; border-bottom: 1px solid #eee; }
                .inv-table tbody td.right { text-align: right; font-weight: 600; }
                .inv-total td { padding: 12px 14px; font-weight: 700; font-size: 14px; border-top: 2px solid #111 !important; background: #fff !important; }
                .inv-footer { margin-top: 48px; font-size: 12px; color: #aaa; text-align: center; }
                .inv-print-btn { margin-bottom: 24px; }
                @media print {
                    .inv-print-btn { display: none !important; }
                    .inv-wrap { padding: 0; }
                }
            `}</style>

            <div className="invoice-wrap">
                <div className="inv-print-btn">
                    <PrintButton />
                </div>

                <div className="inv-header">
                    <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.jpg" alt="St George Bakery" style={{ height: '90px', width: 'auto' }} />
                    </div>
                    <div className="inv-meta">
                        <strong>#{invoiceNumber}</strong>
                        {format(new Date(order.created_at), 'dd MMM yyyy')}<br />
                        <span style={{ textTransform: 'capitalize' }}>{order.order_type} Order Invoice</span>
                    </div>
                </div>

                <hr className="inv-divider" />

                <div className="inv-info">
                    <div className="inv-info-section">
                        <h4>Bill To</h4>
                        <p>
                            <strong>{customer?.name}</strong><br />
                            {customer?.email}
                            {customer?.contact_number && <><br />{customer.contact_number}</>}
                            {customer?.delivery_address && <><br />{customer.delivery_address}</>}
                        </p>
                    </div>
                    <div className="inv-info-section">
                        <h4>Delivery Period</h4>
                        <p>{dateLabel}</p>
                    </div>
                </div>

                <table className="inv-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Delivery Date</th>
                            <th className="right">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item: any, idx: number) => (
                            <tr key={idx}>
                                <td>{item.product?.name ?? '—'}</td>
                                <td>{format(parseISO(item.delivery_date), 'EEE dd MMM yyyy')}</td>
                                <td className="right">{item.quantity}</td>
                            </tr>
                        ))}
                        <tr className="inv-total">
                            <td colSpan={2}>Total Items</td>
                            <td className="right">{totalQty}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="inv-footer">
                    Thank you for your order — St. George Bakery, London
                </div>
            </div>
        </>
    );
}
