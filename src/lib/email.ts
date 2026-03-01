import { Resend } from 'resend';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bakery.com';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured — emails will not be sent.');
    return null;
  }
  return new Resend(apiKey);
}

interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderType: 'weekly' | 'daily';
  dates: string;
  items: { productName: string; date: string; quantity: number }[];
  submittedAt: string;
}

export async function sendOrderConfirmationEmail(data: OrderEmailData) {
  try {
    const resend = getResendClient();
    if (!resend) return { success: false, error: 'Email not configured' };

    const itemRows = data.items
      .map(
        (item) =>
          '<tr><td style="padding:8px;border:1px solid #e5e7eb">' + item.productName +
          '</td><td style="padding:8px;border:1px solid #e5e7eb">' + item.date +
          '</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center">' + item.quantity +
          '</td></tr>'
      )
      .join('');

    const orderTypeLabel = data.orderType === 'weekly' ? 'Weekly' : 'Daily';

    // Send to customer
    await resend.emails.send({
      from: 'St George Bakery <orders@yourdomain.com>',
      to: data.customerEmail,
      subject: 'Order Confirmation - ' + orderTypeLabel + ' Order',
      html: [
        '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">',
        '<div style="background:#1e3a5f;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">',
        '<h1 style="margin:0;font-size:24px">St George Bakery</h1>',
        '<p style="margin:5px 0 0;opacity:0.9">Order Confirmation</p>',
        '</div>',
        '<div style="padding:20px;background:#f9fafb;border:1px solid #e5e7eb">',
        '<p>Dear <strong>' + data.customerName + '</strong>,</p>',
        '<p>Your <strong>' + data.orderType + '</strong> order has been successfully submitted.</p>',
        '<p><strong>Dates:</strong> ' + data.dates + '</p>',
        '<p><strong>Submitted:</strong> ' + data.submittedAt + '</p>',
        '<table style="width:100%;border-collapse:collapse;margin:16px 0">',
        '<thead><tr style="background:#1e3a5f;color:white">',
        '<th style="padding:8px;text-align:left">Product</th>',
        '<th style="padding:8px;text-align:left">Date</th>',
        '<th style="padding:8px;text-align:center">Qty</th>',
        '</tr></thead>',
        '<tbody>' + itemRows + '</tbody>',
        '</table>',
        '<p style="color:#6b7280;font-size:14px">This order is now locked and cannot be edited.</p>',
        '</div>',
        '<div style="padding:12px;text-align:center;color:#9ca3af;font-size:12px">St George Bakery</div>',
        '</div>',
      ].join(''),
    });

    // Send notification to admin
    await resend.emails.send({
      from: 'St George Bakery <orders@yourdomain.com>',
      to: ADMIN_EMAIL,
      subject: 'New ' + data.orderType + ' Order - ' + data.customerName,
      html: [
        '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">',
        '<div style="background:#dc2626;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">',
        '<h1 style="margin:0;font-size:20px">New Order Notification</h1>',
        '</div>',
        '<div style="padding:20px;background:#f9fafb;border:1px solid #e5e7eb">',
        '<p><strong>Customer:</strong> ' + data.customerName + '</p>',
        '<p><strong>Order Type:</strong> ' + data.orderType + '</p>',
        '<p><strong>Dates:</strong> ' + data.dates + '</p>',
        '<p><strong>Submitted At:</strong> ' + data.submittedAt + '</p>',
        '<p><strong>Items:</strong> ' + data.items.length + ' product entries</p>',
        '</div>',
        '</div>',
      ].join(''),
    });

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}
