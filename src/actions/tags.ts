'use server';

import { createClient } from '@/lib/supabase/server';
import { Product } from '@/lib/types';

// ─── Tag CRUD ──────────────────────────────────────────────────────────────

export async function getTags() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function createTag(formData: FormData) {
    const supabase = await createClient();
    const name = (formData.get('name') as string)?.trim();
    if (!name) return { error: 'Name is required' };

    const { error } = await supabase.from('tags').insert({ name });
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteTag(tagId: string) {
    const supabase = await createClient();
    // CASCADE removes product_tags + customer_tags rows automatically
    const { error } = await supabase.from('tags').delete().eq('id', tagId);
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Product Tags ──────────────────────────────────────────────────────────

export async function getProductTags(productId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('product_tags')
        .select('tag_id')
        .eq('product_id', productId);

    if (error) return [];
    return data?.map((r: any) => r.tag_id) ?? [];
}

export async function setProductTags(productId: string, tagIds: string[]) {
    const supabase = await createClient();

    const { error: delError } = await supabase
        .from('product_tags')
        .delete()
        .eq('product_id', productId);

    if (delError) return { error: delError.message };

    if (tagIds.length > 0) {
        const rows = tagIds.map((tag_id) => ({ product_id: productId, tag_id }));
        const { error: insError } = await supabase.from('product_tags').insert(rows);
        if (insError) return { error: insError.message };
    }

    return { success: true };
}

// ─── Customer Tags ─────────────────────────────────────────────────────────

export async function getCustomerTags(customerId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('customer_tags')
        .select('tag_id')
        .eq('customer_id', customerId);

    if (error) return [];
    return data?.map((r: any) => r.tag_id) ?? [];
}

export async function setCustomerTags(customerId: string, tagIds: string[]) {
    const supabase = await createClient();

    const { error: delError } = await supabase
        .from('customer_tags')
        .delete()
        .eq('customer_id', customerId);

    if (delError) return { error: delError.message };

    if (tagIds.length > 0) {
        const rows = tagIds.map((tag_id) => ({ customer_id: customerId, tag_id }));
        const { error: insError } = await supabase.from('customer_tags').insert(rows);
        if (insError) return { error: insError.message };
    }

    return { success: true };
}

// ─── Filtered products for current customer ───────────────────────────────

/**
 * Returns active products filtered by the current customer's assigned tags.
 * If the customer has no tags assigned, all active products are returned
 * (backward compatible — customers without tags see everything).
 */
export async function getActiveProductsForCustomer(): Promise<Product[]> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1. Fetch this customer's tag IDs
    const { data: customerTagRows } = await supabase
        .from('customer_tags')
        .select('tag_id')
        .eq('customer_id', user.id);

    const tagIds = customerTagRows?.map((r: any) => r.tag_id) ?? [];

    let productIds: string[] | null = null;

    if (tagIds.length > 0) {
        // 2. Find product IDs that have at least one matching tag
        const { data: productTagRows } = await supabase
            .from('product_tags')
            .select('product_id')
            .in('tag_id', tagIds);

        productIds = [...new Set(productTagRows?.map((r: any) => r.product_id) ?? [])];

        // No products match the customer's tags → return empty
        if (productIds.length === 0) return [];
    }

    // 3. Fetch the products (with category and tags)
    let query = supabase
        .from('products')
        .select('*, category:product_categories(id, name), tags:product_tags(tag:tags(id, name))')
        .eq('active_status', true)
        .order('display_order', { ascending: true });

    if (productIds !== null) {
        query = query.in('id', productIds);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map((p: any) => ({
        ...p,
        tags: (p.tags ?? []).map((pt: any) => pt.tag).filter(Boolean),
    })) as Product[];
}
