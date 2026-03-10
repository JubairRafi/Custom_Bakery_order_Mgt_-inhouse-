'use server';

import { createClient } from '@/lib/supabase/server';

export async function createNotification(
    type: 'new_order' | 'order_edited',
    title: string,
    message: string,
    orderId: string
) {
    const supabase = await createClient();
    await supabase.from('notifications').insert({
        type,
        title,
        message,
        order_id: orderId,
    });
}

export async function getNotifications(page = 1, pageSize = 20) {
    const supabase = await createClient();
    const from = (page - 1) * pageSize;

    const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    return { data: data ?? [], count: count ?? 0, hasMore: (from + pageSize) < (count ?? 0) };
}

export async function getUnreadCount() {
    const supabase = await createClient();
    const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);

    if (error) return 0;
    return count ?? 0;
}

export async function markAsRead(notificationId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function markAllAsRead() {
    const supabase = await createClient();
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

    if (error) return { error: error.message };
    return { success: true };
}
