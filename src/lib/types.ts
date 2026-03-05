// ─── Database Types ────────────────────────────────────

export type UserRole = 'admin' | 'customer';
export type OrderType = 'weekly' | 'daily';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    active_status: boolean;
    created_at: string;
}

export interface Category {
    id: string;
    name: string;
    display_order: number;
    created_at: string;
}

export interface Tag {
    id: string;
    name: string;
    created_at: string;
}

export interface Product {
    id: string;
    name: string;
    active_status: boolean;
    display_order: number;
    created_at: string;
    category_id?: string | null;
    category?: { id: string; name: string } | null;
    tags?: { id: string; name: string }[];
    cutoff_hours?: number | null;
}

export interface CustomerDefaultProduct {
    customer_id: string;
    product_id: string;
    product?: Product;
}

export interface Order {
    id: string;
    customer_id: string;
    order_type: OrderType;
    week_start_date: string | null;
    delivery_date: string | null;
    status: string;
    created_at: string;
    created_by: string;
    customer?: User;
    order_items?: OrderItem[];
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    delivery_date: string;
    quantity: number;
    product?: Product;
}

export interface Settings {
    id: number;
    daily_cutoff_time: string;
    weekly_cutoff_day: number;
    weekly_cutoff_time: string;
}

// ─── Form Types ────────────────────────────────────────

export interface WeeklyOrderEntry {
    product_id: string;
    product_name: string;
    quantities: { [date: string]: number }; // date string -> quantity
}

export interface DailyOrderEntry {
    product_id: string;
    product_name: string;
    quantity: number;
}

export interface OverlapInfo {
    customer_id: string;
    customer_name: string;
    product_id: string;
    product_name: string;
    delivery_date: string;
    weekly_quantity: number;
    daily_quantity: number;
}
