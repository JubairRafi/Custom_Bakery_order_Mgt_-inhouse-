/**
 * Seed script — generates realistic historical order data for load testing.
 *
 * Usage:
 *   npm run seed              # seed 6 months of data
 *   MONTHS=12 npm run seed    # seed 12 months
 *   npm run seed:clear        # delete all seeded data
 */

import { createClient } from '@supabase/supabase-js';
import { format, addDays, addWeeks, subMonths, startOfWeek } from 'date-fns';

// ─── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const MONTHS_BACK = parseInt(process.env.MONTHS ?? '6');
const BATCH_SIZE = 400; // safe limit per Supabase insert call

/** Status value written to seeded orders so we can delete them cleanly */
const SEED_STATUS = 'seeded';

// ─── Helpers ───────────────────────────────────────────────────────────────

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample<T>(arr: T[], n: number): T[] {
    return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

async function batchInsert(table: string, rows: Record<string, unknown>[]) {
    let total = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from(table).insert(batch);
        if (error) throw new Error(`Insert error on [${table}]: ${error.message}`);
        total += batch.length;
        process.stdout.write(`\r  → ${table}: ${total} / ${rows.length} rows`);
    }
    if (rows.length > 0) process.stdout.write('\n');
}

// ─── Clear ─────────────────────────────────────────────────────────────────

async function clearSeedData() {
    console.log('\n🗑  Clearing seeded data...');

    // order_items are deleted via CASCADE when their parent order is deleted
    const { error, count } = await supabase
        .from('orders')
        .delete({ count: 'exact' })
        .eq('status', SEED_STATUS);

    if (error) {
        console.error('Error clearing seed data:', error.message);
        process.exit(1);
    }

    console.log(`✅ Deleted ${count ?? 0} seeded orders (order_items removed via cascade).`);
}

// ─── Seed ──────────────────────────────────────────────────────────────────

async function seedData() {
    console.log(`\n🌱 Seeding ${MONTHS_BACK} months of order data...\n`);

    // 1. Fetch existing customers, products, and an admin user for created_by
    const [{ data: customers, error: custErr }, { data: products, error: prodErr }, { data: adminUser, error: adminErr }] = await Promise.all([
        supabase.from('users').select('id, name').eq('role', 'customer').eq('active_status', true),
        supabase.from('products').select('id, name').eq('active_status', true),
        supabase.from('users').select('id').eq('role', 'admin').limit(1).single(),
    ]);

    if (custErr) throw new Error(`Fetch customers: ${custErr.message}`);
    if (prodErr) throw new Error(`Fetch products: ${prodErr.message}`);
    if (adminErr || !adminUser) throw new Error(`Fetch admin user: ${adminErr?.message ?? 'no admin found'}`);

    const adminId = adminUser.id;

    if (!customers || customers.length === 0) {
        console.warn('⚠  No active customers found. Create some customers first, then run the seed.');
        process.exit(0);
    }
    if (!products || products.length === 0) {
        console.warn('⚠  No active products found. Create some products first, then run the seed.');
        process.exit(0);
    }

    console.log(`Found ${customers.length} customer(s) and ${products.length} product(s).\n`);

    const today = new Date();
    const startDate = startOfWeek(subMonths(today, MONTHS_BACK), { weekStartsOn: 1 });
    const endDate = addWeeks(today, 2);

    // Build list of all Mondays in the date range
    const mondays: string[] = [];
    let cur = startDate;
    while (cur < endDate) {
        mondays.push(format(cur, 'yyyy-MM-dd'));
        cur = addWeeks(cur, 1);
    }

    // Build list of all business days (Mon–Fri) in the date range
    const businessDays: string[] = [];
    let day = startDate;
    while (day < endDate) {
        const dow = day.getDay(); // 0=Sun, 6=Sat
        if (dow >= 1 && dow <= 5) {
            businessDays.push(format(day, 'yyyy-MM-dd'));
        }
        day = addDays(day, 1);
    }

    console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} → ${format(endDate, 'yyyy-MM-dd')}`);
    console.log(`Weeks: ${mondays.length} | Business days: ${businessDays.length}\n`);

    const allOrders: Record<string, unknown>[] = [];
    const allItems: Record<string, unknown>[] = [];

    // 2. Generate orders per customer
    for (const customer of customers) {
        const cid = customer.id;

        // ── Weekly orders: one per week ──────────────────────────────────
        for (const monday of mondays) {
            // Skip ~10% of weeks randomly (realistic: customer skips occasionally)
            if (Math.random() < 0.1) continue;

            const orderId = crypto.randomUUID();
            allOrders.push({
                id: orderId,
                customer_id: cid,
                order_type: 'weekly',
                week_start_date: monday,
                status: SEED_STATUS,
                created_by: adminId,
            });

            // Pick 2–4 random products for this order
            const chosenProducts = sample(products, randomInt(2, Math.min(4, products.length)));
            // Pick 4–7 days of the week to have quantities
            const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(new Date(monday), i), 'yyyy-MM-dd'));
            const activeDays = sample(weekDates, randomInt(4, 7));

            for (const prod of chosenProducts) {
                for (const date of activeDays) {
                    allItems.push({
                        order_id: orderId,
                        product_id: prod.id,
                        delivery_date: date,
                        quantity: randomInt(5, 50),
                    });
                }
            }
        }

        // ── Daily orders: ~3 per month scattered on business days ────────
        const dailyCount = Math.round(MONTHS_BACK * 3);
        const chosenDays = sample(businessDays, dailyCount);

        for (const deliveryDate of chosenDays) {
            const orderId = crypto.randomUUID();
            allOrders.push({
                id: orderId,
                customer_id: cid,
                order_type: 'daily',
                delivery_date: deliveryDate,
                status: SEED_STATUS,
                created_by: adminId,
            });

            const chosenProducts = sample(products, randomInt(1, Math.min(3, products.length)));
            for (const prod of chosenProducts) {
                allItems.push({
                    order_id: orderId,
                    product_id: prod.id,
                    delivery_date: deliveryDate,
                    quantity: randomInt(10, 100),
                });
            }
        }
    }

    console.log(`Preparing to insert:`);
    console.log(`  Orders:      ${allOrders.length}`);
    console.log(`  Order items: ${allItems.length}\n`);

    // 3. Bulk insert
    await batchInsert('orders', allOrders);
    await batchInsert('order_items', allItems);

    console.log(`\n✅ Done! Seeded ${allOrders.length} orders and ${allItems.length} order_items.`);
    console.log(`   Run "npm run seed:clear" to remove all seeded data.\n`);
}

// ─── Entry point ───────────────────────────────────────────────────────────

const isClear = process.argv.includes('--clear');
(isClear ? clearSeedData() : seedData()).catch((err) => {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
});
