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
                <div className="p-5 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                                🍞
                            </div>
                            <div>
                                <h1 className="text-white font-bold text-sm">St George Bakery</h1>
                                <p className="text-xs opacity-50 text-sidebar-text capitalize">{userRole} Portal</p>
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

                {/* User Info */}
                <div className="px-5 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white' }}>
                            {userName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p className="text-white text-sm font-medium">{userName}</p>
                            <p className="text-xs text-sidebar-text opacity-60 capitalize">{userRole}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    <p className="px-5 mb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-text opacity-40">
                        Navigation
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
                                {isActive && <ChevronRight size={14} className="opacity-60" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-white/10">
                    <form action={logout}>
                        <button
                            type="submit"
                            className="sidebar-link w-full text-red-400 hover:!text-red-300 hover:!bg-red-500/10"
                        >
                            <LogOut size={18} />
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
];

export const adminLinks: SidebarLink[] = [
    { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/admin/customers', label: 'Customers', icon: <Users size={18} /> },
    { href: '/admin/products', label: 'Products', icon: <Package size={18} /> },
    { href: '/admin/orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
    { href: '/admin/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
];
