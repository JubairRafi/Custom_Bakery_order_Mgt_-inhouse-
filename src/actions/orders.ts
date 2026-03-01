'use server';

import { createClient } from '@/lib/supabase/server';
import { canSubmitWeeklyOrder, canSubmitDailyOrder } from '@/lib/cutoff';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { Settings } from '@/lib/types';
import { format, addDays, parseISO } from 'date-fns';

async function getSettingsForValidation(): Promise<Settings> {
    const supabase = await createClient();
    const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
    return data!;
}

export async function submitWeeklyOrder(
    weekStartDate: string,
    items: { product_id: string; quantities: { [date: string]: number } }[]
) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Server-side cut-off validation
    const settings = await getSettingsForValidation();
    const check = canSubmitWeeklyOrder(parseISO(weekStartDate), settings);
    if (!check.allowed) {
        return { error: check.message };
    }

    // Check for duplicate submission
    const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', user.id)
        .eq('order_type', 'weekly')
        .eq('week_start_date', weekStartDate)
        .limit(1);

    if (existing && existing.length > 0) {
        return { error: 'A weekly order for this week has already been submitted.' };
    }

    // Create the order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            customer_id: user.id,
            order_type: 'weekly',
            week_start_date: weekStartDate,
            created_by: user.id,
        })
        .select()
        .single();

    if (orderError) return { error: orderError.message };

    // Create order items
    const orderItems: { order_id: string; product_id: string; delivery_date: string; quantity: number }[] = [];
    for (const item of items) {
        for (const [date, quantity] of Object.entries(item.quantities)) {
            if (quantity > 0) {
                orderItems.push({
                    order_id: order.id,
                    product_id: item.product_id,
                    delivery_date: date,
                    quantity,
                });
            }
        }
    }

    if (orderItems.length > 0) {
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            // Rollback: delete the order
            await supabase.from('orders').delete().eq('id', order.id);
            return { error: itemsError.message };
        }
    }

    // Send emails (non-blocking)
    try {
        const { data: profile } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', user.id)
            .single();

        const { data: productMap } = await supabase.from('products').select('id, name');
        const products = new Map(productMap?.map((p) => [p.id, p.name]) || []);

        if (profile) {
            sendOrderConfirmationEmail({
                customerName: profile.name,
                customerEmail: profile.email,
                orderType: 'weekly',
                dates: `Week of ${weekStartDate}`,
                items: orderItems.map((oi) => ({
                    productName: products.get(oi.product_id) || 'Unknown',
                    date: oi.delivery_date,
                    quantity: oi.quantity,
                })),
                submittedAt: new Date().toISOString(),
            }).catch(console.error);
        }
    } catch (e) {
        console.error('Email error:', e);
    }

    return { success: true, orderId: order.id };
}

export async function submitDailyOrder(
    deliveryDate: string,
    items: { product_id: string; quantity: number }[]
) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Server-side cut-off validation
    const settings = await getSettingsForValidation();
    const check = canSubmitDailyOrder(parseISO(deliveryDate), settings);
    if (!check.allowed) {
        return { error: check.message };
    }

    // Check for duplicate
    const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', user.id)
        .eq('order_type', 'daily')
        .eq('delivery_date', deliveryDate)
        .limit(1);

    if (existing && existing.length > 0) {
        return { error: 'A daily order for this date has already been submitted.' };
    }

    // Create order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            customer_id: user.id,
            order_type: 'daily',
            delivery_date: deliveryDate,
            created_by: user.id,
        })
        .select()
        .single();

    if (orderError) return { error: orderError.message };

    // Create order items
    const orderItems = items
        .filter((i) => i.quantity > 0)
        .map((i) => ({
            order_id: order.id,
            product_id: i.product_id,
            delivery_date: deliveryDate,
            quantity: i.quantity,
        }));

    if (orderItems.length > 0) {
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            await supabase.from('orders').delete().eq('id', order.id);
            return { error: itemsError.message };
        }
    }

    // Send emails (non-blocking)
    try {
        const { data: profile } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', user.id)
            .single();

        const { data: productMap } = await supabase.from('products').select('id, name');
        const products = new Map(productMap?.map((p) => [p.id, p.name]) || []);

        if (profile) {
            sendOrderConfirmationEmail({
                customerName: profile.name,
                customerEmail: profile.email,
                orderType: 'daily',
                dates: deliveryDate,
                items: orderItems.map((oi) => ({
                    productName: products.get(oi.product_id) || 'Unknown',
                    date: oi.delivery_date,
                    quantity: oi.quantity,
                })),
                submittedAt: new Date().toISOString(),
            }).catch(console.error);
        }
    } catch (e) {
        console.error('Email error:', e);
    }

    return { success: true, orderId: order.id };
}

// ─── Admin Order Actions ───────────────────────────────

export async function getOrders(filters?: {
    customer_id?: string;
    order_type?: string;
    date_from?: string;
    date_to?: string;
}) {
    const supabase = await createClient();

    let query = supabase
        .from('orders')
        .select('*, customer:users!customer_id(name, email), order_items(*, product:products(name))')
        .order('created_at', { ascending: false });

    if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
    }
    if (filters?.order_type) {
        query = query.eq('order_type', filters.order_type);
    }
    if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
}

export async function getOrderById(orderId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('orders')
        .select('*, customer:users!customer_id(name, email), order_items(*, product:products(name))')
        .eq('id', orderId)
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function deleteOrder(orderId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function confirmOrder(orderId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function updateOrderStatus(orderId: string, status: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function adminCreateOrder(
    customerId: string,
    orderType: 'weekly' | 'daily',
    weekStartDate: string | null,
    deliveryDate: string | null,
    items: { product_id: string; delivery_date: string; quantity: number }[]
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            customer_id: customerId,
            order_type: orderType,
            week_start_date: weekStartDate,
            delivery_date: deliveryDate,
            created_by: user.id,
        })
        .select()
        .single();

    if (orderError) return { error: orderError.message };

    const orderItems = items
        .filter((i) => i.quantity > 0)
        .map((i) => ({
            order_id: order.id,
            product_id: i.product_id,
            delivery_date: i.delivery_date,
            quantity: i.quantity,
        }));

    if (orderItems.length > 0) {
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            await supabase.from('orders').delete().eq('id', order.id);
            return { error: itemsError.message };
        }
    }

    return { success: true, orderId: order.id };
}

export async function updateOrderItems(
    orderId: string,
    items: { product_id: string; delivery_date: string; quantity: number }[]
) {
    const supabase = await createClient();

    // Delete existing items
    await supabase.from('order_items').delete().eq('order_id', orderId);

    // Insert updated items
    const orderItems = items
        .filter((i) => i.quantity > 0)
        .map((i) => ({
            order_id: orderId,
            product_id: i.product_id,
            delivery_date: i.delivery_date,
            quantity: i.quantity,
        }));

    if (orderItems.length > 0) {
        const { error } = await supabase
            .from('order_items')
            .insert(orderItems);
        if (error) return { error: error.message };
    }

    return { success: true };
}

// ─── Overlap Detection ─────────────────────────────────

export async function getOverlaps() {
    const supabase = await createClient();

    // Get all order items with order info
    const { data: allItems, error } = await supabase
        .from('order_items')
        .select('*, order:orders(customer_id, order_type), product:products(name)')
        .order('delivery_date');

    if (error) throw new Error(error.message);
    if (!allItems) return [];

    // Group by customer_id + delivery_date + product_id
    const grouped = new Map<string, { weekly: number; daily: number; customer_id: string; product_id: string; product_name: string; delivery_date: string }>();

    for (const item of allItems) {
        const order = item.order as any;
        if (!order) continue;
        const key = `${order.customer_id}-${item.delivery_date}-${item.product_id}`;

        if (!grouped.has(key)) {
            grouped.set(key, {
                weekly: 0,
                daily: 0,
                customer_id: order.customer_id,
                product_id: item.product_id,
                product_name: (item.product as any)?.name || 'Unknown',
                delivery_date: item.delivery_date,
            });
        }

        const entry = grouped.get(key)!;
        if (order.order_type === 'weekly') {
            entry.weekly += item.quantity;
        } else {
            entry.daily += item.quantity;
        }
    }

    // Return only items where both weekly and daily exist
    const overlaps = Array.from(grouped.values()).filter(
        (g) => g.weekly > 0 && g.daily > 0
    );

    // Enrich with customer names
    if (overlaps.length > 0) {
        const customerIds = [...new Set(overlaps.map((o) => o.customer_id))];
        const { data: customers } = await supabase
            .from('users')
            .select('id, name')
            .in('id', customerIds);

        const customerMap = new Map(customers?.map((c) => [c.id, c.name]) || []);

        return overlaps.map((o) => ({
            ...o,
            customer_name: customerMap.get(o.customer_id) || 'Unknown',
        }));
    }

    return [];
}

// ─── Resolve Overlap ───────────────────────────────────

export async function resolveOverlap(
    customerId: string,
    productId: string,
    deliveryDate: string,
    keep: 'weekly' | 'daily'
) {
    const supabase = await createClient();
    const removeType = keep === 'weekly' ? 'daily' : 'weekly';

    // Find order items to delete: items from orders of the type we're removing
    // that match this customer, product, and delivery date
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customerId)
        .eq('order_type', removeType);

    if (ordersError) return { error: ordersError.message };
    if (!orders || orders.length === 0) return { error: 'No matching orders found' };

    const orderIds = orders.map((o) => o.id);

    // Delete matching order items
    const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds)
        .eq('product_id', productId)
        .eq('delivery_date', deliveryDate);

    if (deleteError) return { error: deleteError.message };

    // Clean up: delete any orders that now have zero items
    for (const orderId of orderIds) {
        const { data: remaining } = await supabase
            .from('order_items')
            .select('id')
            .eq('order_id', orderId)
            .limit(1);

        if (!remaining || remaining.length === 0) {
            await supabase.from('orders').delete().eq('id', orderId);
        }
    }

    return { success: true };
}

// ─── Customer Order History ────────────────────────────

export async function getMyOrders() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(name))')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getLastWeeklyOrder() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get the most recent weekly order for this customer
    const { data: order, error } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(name))')
        .eq('customer_id', user.id)
        .eq('order_type', 'weekly')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !order) return null;

    // Return the items with product info
    return {
        week_start_date: order.week_start_date,
        items: (order.order_items || []).map((item: any) => ({
            product_id: item.product_id,
            product_name: (item.product as any)?.name || 'Unknown',
            delivery_date: item.delivery_date,
            quantity: item.quantity,
        })),
    };
}

// ─── Production Summary ────────────────────────────────

export async function getProductionSummary(date: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('order_items')
        .select('product_id, quantity, product:products(name)')
        .eq('delivery_date', date);

    if (error) throw new Error(error.message);
    if (!data) return [];

    // Aggregate by product
    const summary = new Map<string, { product_name: string; total_quantity: number }>();
    for (const item of data) {
        const key = item.product_id;
        if (!summary.has(key)) {
            summary.set(key, {
                product_name: (item.product as any)?.name || 'Unknown',
                total_quantity: 0,
            });
        }
        summary.get(key)!.total_quantity += item.quantity;
    }

    return Array.from(summary.values()).sort((a, b) => a.product_name.localeCompare(b.product_name));
}
