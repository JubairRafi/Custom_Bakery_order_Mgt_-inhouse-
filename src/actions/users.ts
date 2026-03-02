'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { Product } from '@/lib/types';

export async function getUsers() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

    if (error) throw new Error(error.message);
    return data;
}

export async function getCustomers() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'customer')
        .order('name');

    if (error) throw new Error(error.message);
    return data;
}

export async function createCustomer(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Use service role client to create auth user
    const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: authUser, error: authError } = await serviceSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'customer' },
    });

    if (authError) {
        return { error: authError.message };
    }

    return { success: true, userId: authUser.user.id };
}

export async function updateCustomer(userId: string, formData: FormData) {
    const supabase = await createClient();
    const name = formData.get('name') as string;
    const active_status = formData.get('active_status') === 'true';

    const { error } = await supabase
        .from('users')
        .update({ name, active_status })
        .eq('id', userId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function deactivateCustomer(userId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('users')
        .update({ active_status: false })
        .eq('id', userId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function resetCustomerPassword(userId: string, newPassword: string) {
    const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await serviceSupabase.auth.admin.updateUserById(userId, {
        password: newPassword,
    });

    if (error) return { error: error.message };
    return { success: true };
}

export async function getCustomerDefaultProducts(customerId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('customer_default_products')
        .select('*, product:products(*)')
        .eq('customer_id', customerId);

    if (error) throw new Error(error.message);
    return data;
}

export async function getMyDefaultProducts(): Promise<Product[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('customer_default_products')
        .select('product:products(*)')
        .eq('customer_id', user.id);

    if (error || !data) return [];

    return data
        .map((d: any) => d.product)
        .filter((p: any) => p && p.active_status)
        .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

export async function setCustomerDefaultProducts(customerId: string, productIds: string[]) {
    const supabase = await createClient();

    // Delete existing defaults
    await supabase
        .from('customer_default_products')
        .delete()
        .eq('customer_id', customerId);

    // Insert new defaults
    if (productIds.length > 0) {
        const inserts = productIds.map((pid) => ({
            customer_id: customerId,
            product_id: pid,
        }));

        const { error } = await supabase
            .from('customer_default_products')
            .insert(inserts);

        if (error) return { error: error.message };
    }

    return { success: true };
}
