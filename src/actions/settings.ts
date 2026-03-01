'use server';

import { createClient } from '@/lib/supabase/server';
import { canSubmitWeeklyOrder, canSubmitDailyOrder } from '@/lib/cutoff';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { Settings } from '@/lib/types';
import { format, addDays } from 'date-fns';

export async function getSettings(): Promise<Settings> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function updateSettings(formData: FormData) {
    const supabase = await createClient();

    const daily_cutoff_time = formData.get('daily_cutoff_time') as string;
    const weekly_cutoff_day = parseInt(formData.get('weekly_cutoff_day') as string);
    const weekly_cutoff_time = formData.get('weekly_cutoff_time') as string;

    const { error } = await supabase
        .from('settings')
        .update({ daily_cutoff_time, weekly_cutoff_day, weekly_cutoff_time })
        .eq('id', 1);

    if (error) return { error: error.message };
    return { success: true };
}
