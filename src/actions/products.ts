'use server';

import { createClient } from '@/lib/supabase/server';

export async function getProducts() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('products')
        .select('*, category:product_categories(id, name), tags:product_tags(tag:tags(id, name))')
        .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(normalizeProduct);
}

export async function getActiveProducts() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('products')
        .select('*, category:product_categories(id, name), tags:product_tags(tag:tags(id, name))')
        .eq('active_status', true)
        .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(normalizeProduct);
}

export async function getProductsPaginated(
    page = 1,
    pageSize = 50,
    filters: { search?: string; status?: string; category_id?: string; tag_id?: string } = {}
) {
    const supabase = await createClient();
    const from = (page - 1) * pageSize;

    // Handle tag filter via subquery (product_tags join can't be filtered directly)
    if (filters.tag_id) {
        const { data: tagLinks } = await supabase
            .from('product_tags').select('product_id').eq('tag_id', filters.tag_id);
        const ids = (tagLinks ?? []).map((t: any) => t.product_id);
        if (ids.length === 0) return { data: [], count: 0, hasMore: false };
        filters = { ...filters, _productIds: ids } as any;
    }

    let query = supabase
        .from('products')
        .select('*, category:product_categories(id, name), tags:product_tags(tag:tags(id, name))', { count: 'exact' })
        .order('display_order', { ascending: true });

    if (filters.search) query = query.ilike('name', `%${filters.search}%`);
    if (filters.status === 'active') query = query.eq('active_status', true);
    if (filters.status === 'inactive') query = query.eq('active_status', false);
    if (filters.category_id) query = query.eq('category_id', filters.category_id);
    if ((filters as any)._productIds) query = query.in('id', (filters as any)._productIds);

    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    return {
        data: (data ?? []).map(normalizeProduct),
        count: count ?? 0,
        hasMore: (from + pageSize) < (count ?? 0),
    };
}

/** Flatten nested product_tags join into a flat tags array */
function normalizeProduct(p: any) {
    return {
        ...p,
        tags: (p.tags ?? []).map((pt: any) => pt.tag).filter(Boolean),
    };
}

export async function createProduct(formData: FormData) {
    const supabase = await createClient();
    const name = formData.get('name') as string;
    const category_id = (formData.get('category_id') as string) || null;

    // Get max display order
    const { data: maxOrder } = await supabase
        .from('products')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

    const display_order = (maxOrder?.display_order || 0) + 1;

    const cutoff_hours_raw = formData.get('cutoff_hours') as string;
    const cutoff_hours = cutoff_hours_raw ? parseInt(cutoff_hours_raw, 10) : null;

    const weight = (formData.get('weight') as string) || null;
    const minimum_order_raw = formData.get('minimum_order') as string;
    const minimum_order = minimum_order_raw ? parseInt(minimum_order_raw, 10) : null;
    const risk_number = (formData.get('risk_number') as string) || null;
    const yield_amount_raw = formData.get('yield_amount') as string;
    const yield_amount = yield_amount_raw ? parseFloat(yield_amount_raw) : null;
    const yield_unit = (formData.get('yield_unit') as string) || null;
    const allergens = (formData.get('allergens') as string) || null;
    const ingredient = (formData.get('ingredient') as string) || null;
    const product_code = (formData.get('product_code') as string) || null;
    const image_url = (formData.get('image_url') as string) || null;

    const { data, error } = await supabase
        .from('products')
        .insert({ name, display_order, category_id, cutoff_hours, weight, minimum_order, risk_number, yield_amount, yield_unit, allergens, ingredient, product_code, image_url })
        .select('id')
        .single();

    if (error) return { error: error.message };
    return { success: true, id: data.id };
}

export async function updateProduct(productId: string, formData: FormData) {
    const supabase = await createClient();
    const name = formData.get('name') as string;
    const active_status = formData.get('active_status') === 'true';
    const category_id = (formData.get('category_id') as string) || null;
    const cutoff_hours_raw = formData.get('cutoff_hours') as string;
    const cutoff_hours = cutoff_hours_raw ? parseInt(cutoff_hours_raw, 10) : null;

    const weight = (formData.get('weight') as string) || null;
    const minimum_order_raw = formData.get('minimum_order') as string;
    const minimum_order = minimum_order_raw ? parseInt(minimum_order_raw, 10) : null;
    const risk_number = (formData.get('risk_number') as string) || null;
    const yield_amount_raw = formData.get('yield_amount') as string;
    const yield_amount = yield_amount_raw ? parseFloat(yield_amount_raw) : null;
    const yield_unit = (formData.get('yield_unit') as string) || null;
    const allergens = (formData.get('allergens') as string) || null;
    const ingredient = (formData.get('ingredient') as string) || null;
    const product_code = (formData.get('product_code') as string) || null;
    const image_url = (formData.get('image_url') as string) || null;

    const { error } = await supabase
        .from('products')
        .update({ name, active_status, category_id, cutoff_hours, weight, minimum_order, risk_number, yield_amount, yield_unit, allergens, ingredient, product_code, image_url })
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

export async function bulkCreateProducts(
    rows: { name: string; category_id: string | null; active_status: boolean; tag_ids: string[]; weight?: string | null; minimum_order?: number | null; risk_number?: string | null; yield_amount?: number | null; yield_unit?: string | null; allergens?: string | null; ingredient?: string | null; product_code?: string | null; image_url?: string | null }[]
) {
    const supabase = await createClient();
    if (rows.length === 0) return { inserted: 0 };

    const { data: maxOrder } = await supabase
        .from('products')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

    let nextOrder = (maxOrder?.display_order ?? 0) + 1;

    const toInsert = rows.map((r) => ({
        name: r.name.trim(),
        category_id: r.category_id,
        active_status: r.active_status,
        display_order: nextOrder++,
        weight: r.weight || null,
        minimum_order: r.minimum_order || null,
        risk_number: r.risk_number || null,
        yield_amount: r.yield_amount || null,
        yield_unit: r.yield_unit || null,
        allergens: r.allergens || null,
        ingredient: r.ingredient || null,
        product_code: r.product_code || null,
        image_url: r.image_url || null,
    }));

    const { data, error } = await supabase
        .from('products')
        .insert(toInsert)
        .select('id');

    if (error) return { error: error.message, inserted: 0 };

    // Insert product_tags for rows that have tags
    const tagRows: { product_id: string; tag_id: string }[] = [];
    (data ?? []).forEach((product, i) => {
        for (const tag_id of rows[i].tag_ids) {
            tagRows.push({ product_id: product.id, tag_id });
        }
    });

    if (tagRows.length > 0) {
        await supabase.from('product_tags').insert(tagRows);
    }

    return { inserted: data?.length ?? 0 };
}

export async function bulkDeleteProducts(ids: string[]) {
    const supabase = await createClient();
    if (ids.length === 0) return { deleted: 0 };
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) return { error: error.message };
    return { deleted: ids.length };
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
