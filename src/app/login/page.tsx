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
        <div className="min-h-screen flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
        }}>
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
                <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
            </div>

            <div className="relative z-10 w-full max-w-md px-4">
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
                    }}>
                        <span className="text-4xl">🍞</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-1">St George Bakery</h1>
                    <p className="text-blue-200 opacity-80">Order Management Portal</p>
                </div>

                {/* Login Card */}
                <div className="rounded-2xl p-8" style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                }}>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Sign in to your account</h2>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg text-sm font-medium animate-fade-in"
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="form-input"
                                placeholder="you@company.com"
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="form-input"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full mt-2"
                            style={{ padding: '12px', fontSize: '1rem' }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-blue-200 opacity-50 mt-6 text-sm">
                    © {new Date().getFullYear()} St George Bakery. All rights reserved.
                </p>
            </div>
        </div>
    );
}
