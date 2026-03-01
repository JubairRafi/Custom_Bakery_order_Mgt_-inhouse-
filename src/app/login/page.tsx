'use client';

import { useState } from 'react';
import { login } from '@/actions/auth';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{
            background: '#1a1f2e',
        }}>
            <div className="w-full max-w-[420px] animate-fade-in">
                {/* Logo / Branding */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-28 h-28 rounded-[2.5rem] mb-6 shadow-[0_15px_40px_rgba(245,158,11,0.3)]" style={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    }}>
                        <span className="text-5xl drop-shadow-lg">🍞</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">St George Bakery</h1>

                    <div className="flex justify-center mb-6">
                        <div className="h-4 w-12 bg-accent rounded-full opacity-90 shadow-[0_0_15px_rgba(245,158,11,0.4)]"></div>
                    </div>

                    <p className="text-gray-400 font-bold tracking-[0.1em] uppercase text-[11px] opacity-60">Order Management Portal</p>
                </div>

                {/* Login Card */}
                <div className="rounded-[4rem] p-12 border border-white/5" style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
                }}>
                    <h2 className="text-3xl font-extrabold text-white mb-10 text-center">Welcome Back</h2>

                    {error && (
                        <div className="mb-6 p-4 rounded-2xl text-xs font-semibold animate-shake border border-red-500/10 text-center"
                            style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#fca5a5' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-400 ml-4 block" htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full bg-[#1e293b]/80 border border-white/5 rounded-[1.5rem] px-8 py-6 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all duration-300"
                                placeholder="name@bakery.com"
                                autoComplete="email"
                                style={{ fontSize: '1.2rem' }}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-400 ml-4 block" htmlFor="password">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full bg-[#1e293b]/80 border border-white/5 rounded-[1.5rem] px-8 py-6 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all duration-300"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                style={{ fontSize: '1.2rem' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent hover:bg-accent-light text-primary-dark font-black py-6 rounded-[1.8rem] shadow-xl shadow-accent/20 transform transition-all duration-300 active:scale-[0.98] mt-6"
                            style={{ fontSize: '1.3rem' }}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin mx-auto" size={28} />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-gray-500 font-bold text-sm tracking-wide opacity-40">
                        &copy; {new Date().getFullYear()} St George Bakery
                    </p>
                </div>
            </div>
        </div>
    );
}
