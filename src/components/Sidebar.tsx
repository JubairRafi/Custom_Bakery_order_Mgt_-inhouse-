'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/actions/auth';
import {
    LayoutDashboard, CalendarDays, CalendarPlus, History,
    Users, Package, ShoppingCart, BarChart3, Settings, LogOut,
    Menu, X, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

interface SidebarLink {
    href: string;
    label: string;
    icon: React.ReactNode;
}

interface SidebarProps {
    links: SidebarLink[];
    userName: string;
    userRole: 'admin' | 'customer';
}

export default function Sidebar({ links, userName, userRole }: SidebarProps) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile Toggle */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar-bg text-white md:hidden"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
            >
                <Menu size={22} />
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-accent/20"
                                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                                🍞
                            </div>
                            <div>
                                <h1 className="text-white font-bold text-xs leading-tight tracking-tight">St George Bakery</h1>
                                <p className="text-[9px] font-semibold opacity-60 text-accent uppercase tracking-wider mt-0.5">{userRole} Portal</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="text-sidebar-text md:hidden"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    <p className="px-5 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-text opacity-30">
                        
                    </p>
                    {links.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                {link.icon}
                                <span className="flex-1">{link.label}</span>
                                {isActive && <ChevronRight size={12} className="opacity-40" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer: User Info + Logout */}
                <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-3 px-2 py-3 mb-2 border-b border-white/5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shadow-inner"
                            style={{ background: 'linear-gradient(135deg, #475569, #1e293b)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {userName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold tracking-tight truncate">{userName}</p>
                            <p className="text-[9px] text-accent opacity-50 font-bold uppercase tracking-widest">{userRole}</p>
                        </div>
                    </div>

                    <form action={logout}>
                        <button
                            type="submit"
                            className="sidebar-link w-full text-red-500 hover:!text-red-400 hover:!bg-red-500/5 !m-0 !px-3 !py-2 !gap-3 text-[13px] font-semibold"
                        >
                            <LogOut size={16} />
                            <span>Sign Out</span>
                        </button>
                    </form>
                </div>
            </aside>
        </>
    );
}

// ─── Predefined Link Sets ──────────────────────────────

export const customerLinks: SidebarLink[] = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/dashboard/weekly-order', label: 'Weekly Order', icon: <CalendarDays size={18} /> },
    { href: '/dashboard/daily-order', label: 'Daily Order', icon: <CalendarPlus size={18} /> },
    { href: '/dashboard/history', label: 'Order History', icon: <History size={18} /> },
    { href: '/dashboard/my-products', label: 'My Products', icon: <Package size={18} /> },
];

export const adminLinks: SidebarLink[] = [
    { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/admin/customers', label: 'Customers', icon: <Users size={18} /> },
    { href: '/admin/products', label: 'Products', icon: <Package size={18} /> },
    { href: '/admin/orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
    { href: '/admin/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
];
