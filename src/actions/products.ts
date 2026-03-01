'use server';

import { createClient } from '@/lib/supabase/server';

export async function getProducts() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
}

export async function getActiveProducts() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active_status', true)
        .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
}

export async function createProduct(formData: FormData) {
    const supabase = await createClient();
    const name = formData.get('name') as string;

    // Get max display order
    const { data: maxOrder } = await supabase
        .from('products')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

    const display_order = (maxOrder?.display_order || 0) + 1;

    const { error } = await supabase
        .from('products')
        .insert({ name, display_order });

    if (error) return { error: error.message };
    return { success: true };
}

export async function updateProduct(productId: string, formData: FormData) {
    const supabase = await createClient();
    const name = formData.get('name') as string;
    const active_status = formData.get('active_status') === 'true';

    const { error } = await supabase
        .from('products')
        .update({ name, active_status })
        .eq('id', productId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function reorderProducts(orderedIds: string[]) {
    const supabase = await createClient();

    // Update each product's display_order
    const updates = orderedIds.map((id, index) =>
        supabase.from('products').update({ display_order: index }).eq('id', id)
    );

    await Promise.all(updates);
    return { success: true };
}

export async function toggleProductStatus(productId: string) {
    const supabase = await createClient();

    const { data: product } = await supabase
        .from('products')
        .select('active_status')
        .eq('id', productId)
        .single();

    if (!product) return { error: 'Product not found' };

    const { error } = await supabase
        .from('products')
        .update({ active_status: !product.active_status })
        .eq('id', productId);

    if (error) return { error: error.message };
    return { success: true };
}
