'use client';

import { useState } from 'react';
import { login } from '@/actions/auth';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
        e.preventDefault();
        setLoading(true);
        setError('');
        const formData = new FormData(e.currentTarget);
        const result = await login(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f5ede0' }}>
            <div className="w-full max-w-[880px] flex rounded-3xl overflow-hidden animate-fade-in"
                style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.18)' }}>

                {/* ── Left brand panel ───────────────────────────── */}
                <div className="hidden md:flex md:w-[42%] flex-col items-center justify-center p-14 relative overflow-hidden"
                    style={{ background: 'linear-gradient(155deg, #6b3a1f 0%, #a0522d 55%, #c8832a 100%)' }}>

                    {/* Decorative circles */}
                    <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <div className="absolute bottom-24 right-4 w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />

                    {/* Icon */}
                    <div className="relative z-10 w-24 h-24 rounded-2xl flex items-center justify-center mb-8"
                        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 11l19-9-9 19-2-8-8-2z" />
                        </svg>
                    </div>

                    {/* Brand */}
                    <div className="relative z-10 text-center">
                        <h1 className="text-white font-bold leading-tight mb-1" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>
                            St George
                        </h1>
                        <h1 className="text-white font-bold leading-tight" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>
                            Bakery
                        </h1>
                        <div className="mx-auto mt-5 mb-5 w-8 h-px" style={{ background: 'rgba(255,255,255,0.35)' }} />
                        <p className="text-xs font-semibold tracking-[0.18em] uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Order Management
                        </p>
                    </div>

                    {/* Bottom tagline */}
                    <div className="relative z-10 mt-auto pt-12 text-center">
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            Crafted with care,<br />managed with precision.
                        </p>
                    </div>
                </div>

                {/* ── Right form panel ───────────────────────────── */}
                <div className="flex-1 bg-white flex flex-col items-center justify-center py-14" style={{ padding: '56px 40px' }}>
                    <div style={{ width: '100%', maxWidth: '340px' }}>

                        {/* Mobile brand header */}
                        <div className="md:hidden text-center mb-10">
                            <h1 className="text-2xl font-bold text-gray-900">St George Bakery</h1>
                            <p className="text-sm text-gray-400 mt-1">Order Management Portal</p>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
                        <p className="text-sm text-gray-400 mb-8">Sign in to continue to your portal</p>

                        {error && (
                            <div className="mb-6 px-4 py-3 rounded-xl text-sm border"
                                style={{ background: '#fff5f5', borderColor: '#fecaca', color: '#b91c1c' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600" htmlFor="email"
                                    style={{ marginBottom: '8px', paddingLeft: '4px' }}>
                                    Email address
                                </label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        placeholder="you@stgeorge.com"
                                        className="w-full rounded-xl text-sm text-gray-900 outline-none transition-all"
                                        style={{
                                            padding: '13px 16px 13px 40px',
                                            border: '1.5px solid #e5e7eb',
                                            background: '#fafafa',
                                            color: '#111827',
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#a0522d'; e.currentTarget.style.background = '#fff'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fafafa'; }}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600" htmlFor="password"
                                    style={{ marginBottom: '8px', paddingLeft: '4px' }}>
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        className="w-full rounded-xl text-sm text-gray-900 outline-none transition-all"
                                        style={{
                                            padding: '13px 16px 13px 40px',
                                            border: '1.5px solid #e5e7eb',
                                            background: '#fafafa',
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#a0522d'; e.currentTarget.style.background = '#fff'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fafafa'; }}
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.98] mt-2"
                                style={{ background: 'linear-gradient(135deg, #6b3a1f, #a0522d)', boxShadow: '0 4px 14px rgba(107,58,31,0.35)' }}
                                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.92'; }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                            >
                                {loading
                                    ? <Loader2 className="animate-spin mx-auto" size={18} />
                                    : 'Sign In'
                                }
                            </button>
                        </form>

                        <p className="mt-10 text-center text-xs text-gray-300">
                            &copy; {new Date().getFullYear()} St George Bakery
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
