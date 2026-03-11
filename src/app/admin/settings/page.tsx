'use client';

import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '@/actions/settings';
import { Settings as SettingsIcon, Save, Loader2, Clock, CalendarDays, Check, FileText } from 'lucide-react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SettingsPage() {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getSettings().then((s) => {
            setSettings(s);
            setLoading(false);
        });
    }, []);

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess(false);

        const formData = new FormData(e.currentTarget);
        const result = await updateSettings(formData);

        if (result.error) {
            setError(result.error);
        } else {
            setSuccess(true);
            // Reload settings
            const s = await getSettings();
            setSettings(s);
            setTimeout(() => setSuccess(false), 3000);
        }
        setSaving(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-primary" size={36} />
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <SettingsIcon size={24} className="text-primary" />
                    System Settings
                </h1>
                <p className="text-muted text-sm mt-1">Configure cut-off times and system behaviour</p>
            </div>

            {success && (
                <div className="mb-4 p-3 rounded-lg badge-success text-sm font-medium flex items-center gap-2 animate-fade-in">
                    <Check size={16} />
                    Settings saved successfully!
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 rounded-lg badge-danger text-sm font-medium animate-fade-in">
                    {error}
                </div>
            )}

            <form onSubmit={handleSave}>
                {/* Weekly Order Cut-off */}
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', width: '40px', height: '40px' }}>
                            <CalendarDays size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Weekly Order Cut-off</h3>
                            <p className="text-sm text-muted">When weekly orders can no longer be submitted</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                            <label className="form-label">Cut-off Day</label>
                            <select
                                name="weekly_cutoff_day"
                                defaultValue={settings?.weekly_cutoff_day}
                                className="form-input"
                            >
                                {DAY_NAMES.map((day, i) => (
                                    <option key={i} value={i}>{day}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Cut-off Time</label>
                            <input
                                type="time"
                                name="weekly_cutoff_time"
                                defaultValue={settings?.weekly_cutoff_time?.substring(0, 5)}
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: '#eff6ff', color: '#1e40af' }}>
                        <strong>Current:</strong> Weekly orders must be submitted by{' '}
                        <strong>{DAY_NAMES[settings?.weekly_cutoff_day]}</strong> at{' '}
                        <strong>{settings?.weekly_cutoff_time?.substring(0, 5)}</strong>
                    </div>
                </div>

                {/* Daily Order Cut-off */}
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', width: '40px', height: '40px' }}>
                            <Clock size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Daily Order Cut-off</h3>
                            <p className="text-sm text-muted">Cut-off time for daily order submissions</p>
                        </div>
                    </div>

                    <div className="form-group mb-0">
                        <label className="form-label">Cut-off Time</label>
                        <input
                            type="time"
                            name="daily_cutoff_time"
                            defaultValue={settings?.daily_cutoff_time?.substring(0, 5)}
                            className="form-input"
                            style={{ maxWidth: '200px' }}
                        />
                    </div>

                    <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: '#f0fdf4', color: '#166534' }}>
                        <strong>Current:</strong> Daily orders use cut-off time of{' '}
                        <strong>{settings?.daily_cutoff_time?.substring(0, 5)}</strong>
                    </div>
                </div>

                {/* PO Number Setting */}
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', width: '40px', height: '40px' }}>
                            <FileText size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">PO Number</h3>
                            <p className="text-sm text-muted">Allow customers to enter PO numbers with their orders</p>
                        </div>
                    </div>

                    <input type="hidden" name="po_enabled" value={settings?.po_enabled ? 'true' : 'false'} />

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setSettings((prev: any) => ({ ...prev, po_enabled: !prev.po_enabled }))}
                            style={{
                                width: '48px',
                                height: '26px',
                                borderRadius: '13px',
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'background 0.2s',
                                background: settings?.po_enabled ? '#10b981' : '#d1d5db',
                            }}
                        >
                            <span
                                style={{
                                    position: 'absolute',
                                    top: '3px',
                                    left: settings?.po_enabled ? '25px' : '3px',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: '#fff',
                                    transition: 'left 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                }}
                            />
                        </button>
                        <span className="text-sm font-medium text-foreground">
                            {settings?.po_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>

                    <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: settings?.po_enabled ? '#fefce8' : '#f3f4f6', color: settings?.po_enabled ? '#92400e' : '#6b7280' }}>
                        {settings?.po_enabled
                            ? <><strong>Enabled:</strong> Customers can enter PO numbers when placing orders</>
                            : <><strong>Disabled:</strong> PO number fields are hidden from customers</>
                        }
                    </div>
                </div>

                {/* Save */}
                <div className="flex justify-end">
                    <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '12px 28px' }}>
                        {saving ? (
                            <><Loader2 className="animate-spin" size={16} /> Saving...</>
                        ) : (
                            <><Save size={16} /> Save Settings</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
