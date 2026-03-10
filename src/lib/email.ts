import { Resend } from 'resend';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bakery.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'St George Bakery <onboarding@resend.dev>';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'your_resend_api_key' || apiKey.length < 10) {
    console.warn('[EMAIL] RESEND_API_KEY not configured — emails will be skipped.');
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

/**
 * Send notification to admin when a new order is submitted.
 */
export async function sendAdminNotificationEmail(data: OrderEmailData) {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.log('[EMAIL] Skipped — no API key. Order by', data.customerName, 'for', data.dates);
      return { success: false, error: 'Email not configured' };
    }

    const result = await resend.emails.send({
      from: FROM_EMAIL,
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

    console.log('[EMAIL] Sent admin notification to', ADMIN_EMAIL, result);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Admin notification error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send confirmation email to customer when admin confirms the order.
 */
export async function sendCustomerConfirmationEmail(data: OrderEmailData) {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.log('[EMAIL] Skipped — no API key. Confirmation for', data.customerName);
      return { success: false, error: 'Email not configured' };
    }

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

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: 'Order Confirmed - ' + orderTypeLabel + ' Order',
      html: [
        '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">',
        '<div style="background:#1e3a5f;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">',
        '<h1 style="margin:0;font-size:24px">St George Bakery</h1>',
        '<p style="margin:5px 0 0;opacity:0.9">Order Confirmed</p>',
        '</div>',
        '<div style="padding:20px;background:#f9fafb;border:1px solid #e5e7eb">',
        '<p>Dear <strong>' + data.customerName + '</strong>,</p>',
        '<p>Your <strong>' + data.orderType + '</strong> order has been <strong>confirmed</strong> by our team.</p>',
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
        '<p style="color:#16a34a;font-size:14px;font-weight:bold">✓ Your order has been confirmed and is being prepared.</p>',
        '</div>',
        '<div style="padding:12px;text-align:center;color:#9ca3af;font-size:12px">St George Bakery</div>',
        '</div>',
      ].join(''),
    });

    console.log('[EMAIL] Sent confirmation to', data.customerEmail, result);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Customer confirmation error:', error);
    return { success: false, error: String(error) };
  }
}
