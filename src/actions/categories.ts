'use server';

import { createClient } from '@/lib/supabase/server';

export async function getCategories() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function createCategory(formData: FormData) {
    const supabase = await createClient();
    const name = (formData.get('name') as string)?.trim();
    if (!name) return { error: 'Name is required' };

    const { data: maxOrder } = await supabase
        .from('product_categories')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

    const display_order = (maxOrder?.display_order ?? 0) + 1;

    const { error } = await supabase
        .from('product_categories')
        .insert({ name, display_order });

    if (error) return { error: error.message };
    return { success: true };
}

export async function updateCategory(categoryId: string, formData: FormData) {
    const supabase = await createClient();
    const name = (formData.get('name') as string)?.trim();
    if (!name) return { error: 'Name is required' };

    const { error } = await supabase
        .from('product_categories')
        .update({ name })
        .eq('id', categoryId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteCategory(categoryId: string) {
    const supabase = await createClient();
    // products.category_id is SET NULL on delete — existing products unaffected
    const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', categoryId);

    if (error) return { error: error.message };
    return { success: true };
}
