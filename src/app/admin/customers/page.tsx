'use client';

import { useState, useEffect } from 'react';
import { getCustomers, createCustomer, updateCustomer, deactivateCustomer, resetCustomerPassword, getCustomerDefaultProducts, setCustomerDefaultProducts, bulkCreateCustomers } from '@/actions/users';
import { getProducts } from '@/actions/products';
import { getTags, getCustomerTags, setCustomerTags } from '@/actions/tags';
import { Users, Plus, Edit, Ban, KeyRound, Package, Loader2, X, Check, Search, Tag, Upload, AlertCircle } from 'lucide-react';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [allTags, setAllTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState<any>(null);
    const [showResetModal, setShowResetModal] = useState<any>(null);
    const [showDefaultsModal, setShowDefaultsModal] = useState<any>(null);
    const [selectedDefaults, setSelectedDefaults] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkRows, setBulkRows] = useState<{ name: string; email: string; password: string; delivery_address: string; point_of_contact: string; contact_number: string; delivery_time: string }[]>([]);
    const [bulkError, setBulkError] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkResult, setBulkResult] = useState<{ inserted: number; errors: string[] } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const [custs, prods, tgs] = await Promise.all([getCustomers(), getProducts(), getTags()]);
        setCustomers(custs);
        setProducts(prods.filter((p: any) => p.active_status));
        setAllTags(tgs);
        setLoading(false);
    }

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        const formData = new FormData(e.currentTarget);
        const result = await createCustomer(formData);
        if (result.error) {
            setFormError(result.error);
            setFormLoading(false);
        } else {
            setShowCreateModal(false);
            setFormLoading(false);
            loadData();
        }
    }

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const result = await updateCustomer(showEditModal.id, formData);
        if (result.error) {
            setFormError(result.error);
        } else {
            setShowEditModal(null);
            loadData();
        }
        setFormLoading(false);
    }

    async function handleDeactivate(id: string) {
        if (!confirm('Are you sure you want to deactivate this customer?')) return;
        await deactivateCustomer(id);
        loadData();
    }

    async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const newPassword = formData.get('newPassword') as string;
        const result = await resetCustomerPassword(showResetModal.id, newPassword);
        if (result.error) {
            setFormError(result.error);
        } else {
            setShowResetModal(null);
        }
        setFormLoading(false);
    }

    async function openDefaultsModal(customer: any) {
        setShowDefaultsModal(customer);
        setProductSearch('');
        setFormLoading(true);
        const [defaults, tagIds] = await Promise.all([
            getCustomerDefaultProducts(customer.id),
            getCustomerTags(customer.id),
        ]);
        setSelectedDefaults(defaults.map((d: any) => d.product_id));
        setSelectedTags(tagIds);
        setFormLoading(false);
    }

    async function handleSaveDefaults() {
        setFormLoading(true);
        await Promise.all([
            setCustomerDefaultProducts(showDefaultsModal.id, selectedDefaults),
            setCustomerTags(showDefaultsModal.id, selectedTags),
        ]);
        setShowDefaultsModal(null);
        setFormLoading(false);
    }

    function toggleDefault(productId: string) {
        setSelectedDefaults((prev) =>
            prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
    }

    function toggleTag(tagId: string) {
        setSelectedTags((prev) =>
            prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
        );
    }

    function downloadTemplate() {
        const XLSX = require('xlsx');
        const ws = XLSX.utils.aoa_to_sheet([
            ['Name', 'Email', 'Password', 'Delivery Address', 'Point of Contact', 'Contact Number', 'Delivery Time'],
            ['Bakery Kings Road', 'bakery@example.com', 'password123', '126 Kings Rd, London SW3 4TR', 'Circe', '33 680688615', '7h'],
            ['Wine Bar St Martins', 'winebar@example.com', 'password123', '112 St Martins Ln, London WC2N 4BD', 'Erin', '07 490088861', '15h'],
        ]);
        ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 38 }, { wch: 20 }, { wch: 18 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');
        XLSX.writeFile(wb, 'customer_upload_template.xlsx');
    }

    async function handleBulkFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setBulkError('');
        setBulkResult(null);
        try {
            const XLSX = require('xlsx');
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            const parsed = rows.slice(1)
                .filter((r: any[]) => r[0]?.toString().trim())
                .map((r: any[]) => ({
                    name: r[0]?.toString().trim() ?? '',
                    email: r[1]?.toString().trim() ?? '',
                    password: r[2]?.toString().trim() ?? '',
                    delivery_address: r[3]?.toString().trim() ?? '',
                    point_of_contact: r[4]?.toString().trim() ?? '',
                    contact_number: r[5]?.toString().trim() ?? '',
                    delivery_time: r[6]?.toString().trim() ?? '',
                }));
            if (parsed.length === 0) { setBulkError('No data rows found.'); return; }
            setBulkRows(parsed);
        } catch {
            setBulkError('Failed to parse file. Please use the provided template.');
        }
    }

    async function handleBulkUpload() {
        setBulkLoading(true);
        const existingEmails = new Set(customers.map((c) => c.email.toLowerCase()));
        const toInsert = bulkRows
            .filter((r) => r.name && r.email && r.password)
            .filter((r) => !existingEmails.has(r.email.toLowerCase()))
            .map((r) => ({
                name: r.name,
                email: r.email,
                password: r.password,
                delivery_address: r.delivery_address || null,
                point_of_contact: r.point_of_contact || null,
                contact_number: r.contact_number || null,
                delivery_time: r.delivery_time || null,
            }));
        const result = await bulkCreateCustomers(toInsert);
        setBulkResult(result);
        setBulkLoading(false);
        if (result.inserted > 0) loadData();
    }

    const filteredCustomers = customers.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-primary" size={36} />
            </div>
        );
    }

    return (
        <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>
            <div className="shrink-0 flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Users size={24} className="text-primary" />
                        Customer Management
                    </h1>
                    <p className="text-muted text-sm mt-1">{customers.length} customers</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="form-input text-sm"
                            style={{ minWidth: '220px', paddingLeft: '36px' }}
                        />
                    </div>
                    <button onClick={() => { setShowBulkModal(true); setBulkRows([]); setBulkError(''); setBulkResult(null); }} className="btn btn-outline btn-sm">
                        <Upload size={15} /> Bulk Upload
                    </button>
                    <button onClick={() => { setShowCreateModal(true); setFormError(''); }} className="btn btn-primary btn-sm">
                        <Plus size={16} /> Add Customer
                    </button>
                </div>
            </div>

            <div className="card flex-1 overflow-auto min-h-0">
                <table className="data-table">
                    <thead className="sticky top-0 z-[5]">
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Delivery Address</th>
                            <th>Point of Contact</th>
                            <th>Contact Number</th>
                            <th>Delivery Time</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map((c) => (
                            <tr key={c.id}>
                                <td className="font-bold">{c.name}</td>
                                <td className="text-muted">{c.email}</td>
                                <td className="text-sm">{c.delivery_address || <span className="text-muted">—</span>}</td>
                                <td className="text-sm">{c.point_of_contact || <span className="text-muted">—</span>}</td>
                                <td className="text-sm">{c.contact_number || <span className="text-muted">—</span>}</td>
                                <td className="text-sm">{c.delivery_time || <span className="text-muted">—</span>}</td>
                                <td>
                                    <span className={`badge ${c.active_status ? 'badge-success' : 'badge-danger'}`}>
                                        {c.active_status ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => { setShowEditModal(c); setFormError(''); }} className="btn btn-ghost btn-sm" title="Edit">
                                            <Edit size={14} />
                                        </button>
                                        <button onClick={() => openDefaultsModal(c)} className="btn btn-ghost btn-sm" title="Default Products">
                                            <Package size={14} />
                                        </button>
                                        <button onClick={() => { setShowResetModal(c); setFormError(''); }} className="btn btn-ghost btn-sm" title="Reset Password">
                                            <KeyRound size={14} />
                                        </button>
                                        {c.active_status && (
                                            <button onClick={() => handleDeactivate(c.id)} className="btn btn-ghost btn-sm text-danger" title="Deactivate">
                                                <Ban size={14} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredCustomers.length === 0 && (
                    <div className="p-8 text-center text-muted">No customers found.</div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Add Customer</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-foreground"><X size={20} /></button>
                        </div>
                        {formError && <div className="mb-3 p-2 rounded-lg badge-danger text-sm">{formError}</div>}
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input name="name" required className="form-input" placeholder="Customer name" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input name="email" type="email" required className="form-input" placeholder="customer@email.com" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input name="password" type="password" required minLength={6} className="form-input" placeholder="Minimum 6 characters" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Delivery Address</label>
                                <input name="delivery_address" className="form-input" placeholder="Delivery address" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Point of Contact</label>
                                <input name="point_of_contact" className="form-input" placeholder="Contact person name" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contact Number</label>
                                <input name="contact_number" className="form-input" placeholder="Phone number" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Delivery Time</label>
                                <input name="delivery_time" className="form-input" placeholder="e.g. 7h, <12h, 6h30" />
                            </div>
                            <div className="flex gap-3 justify-end mt-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost">Cancel</button>
                                <button type="submit" disabled={formLoading} className="btn btn-primary">
                                    {formLoading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Edit Customer</h3>
                            <button onClick={() => setShowEditModal(null)} className="text-muted hover:text-foreground"><X size={20} /></button>
                        </div>
                        {formError && <div className="mb-3 p-2 rounded-lg badge-danger text-sm">{formError}</div>}
                        <form onSubmit={handleUpdate}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input name="name" required className="form-input" defaultValue={showEditModal.name} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select name="active_status" className="form-input" defaultValue={String(showEditModal.active_status)}>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Delivery Address</label>
                                <input name="delivery_address" className="form-input" defaultValue={showEditModal.delivery_address ?? ''} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Point of Contact</label>
                                <input name="point_of_contact" className="form-input" defaultValue={showEditModal.point_of_contact ?? ''} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contact Number</label>
                                <input name="contact_number" className="form-input" defaultValue={showEditModal.contact_number ?? ''} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Delivery Time</label>
                                <input name="delivery_time" className="form-input" placeholder="e.g. 7h, &lt;12h, 6h30" defaultValue={showEditModal.delivery_time ?? ''} />
                            </div>
                            <div className="flex gap-3 justify-end mt-4">
                                <button type="button" onClick={() => setShowEditModal(null)} className="btn btn-ghost">Cancel</button>
                                <button type="submit" disabled={formLoading} className="btn btn-primary">
                                    {formLoading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Reset Password</h3>
                            <button onClick={() => setShowResetModal(null)} className="text-muted hover:text-foreground"><X size={20} /></button>
                        </div>
                        <p className="text-muted text-sm mb-4">Reset password for <strong>{showResetModal.name}</strong></p>
                        {formError && <div className="mb-3 p-2 rounded-lg badge-danger text-sm">{formError}</div>}
                        <form onSubmit={handleResetPassword}>
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <input name="newPassword" type="password" required minLength={6} className="form-input" placeholder="Minimum 6 characters" />
                            </div>
                            <div className="flex gap-3 justify-end mt-4">
                                <button type="button" onClick={() => setShowResetModal(null)} className="btn btn-ghost">Cancel</button>
                                <button type="submit" disabled={formLoading} className="btn btn-primary">
                                    {formLoading ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />} Reset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Default Products Modal */}
            {showDefaultsModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Default Products</h3>
                            <button onClick={() => setShowDefaultsModal(null)} className="text-muted hover:text-foreground"><X size={20} /></button>
                        </div>
                        <p className="text-muted text-sm mb-4">Select default products for <strong>{showDefaultsModal.name}</strong></p>
                        {formLoading ? (
                            <div className="py-8 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={24} /></div>
                        ) : (
                            <>
                                {/* Default products */}
                                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Default Products</p>
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="form-input mb-2"
                                />
                                <div className="space-y-1 max-h-48 overflow-y-auto mb-1 border rounded-lg p-2">
                                    {products
                                        .filter((p: any) => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                        .map((p: any) => (
                                            <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDefaults.includes(p.id)}
                                                    onChange={() => toggleDefault(p.id)}
                                                    className="w-4 h-4 rounded"
                                                />
                                                <span className="text-sm font-medium">{p.name}</span>
                                            </label>
                                        ))}
                                </div>
                                <p className="text-xs text-muted mb-4">{selectedDefaults.length} product(s) selected</p>

                                {/* Customer tags */}
                                {allTags.length > 0 && (
                                    <>
                                        <div className="border-t pt-4 mb-2">
                                            <p className="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1 mb-1">
                                                <Tag size={12} /> Customer Tags
                                            </p>
                                            <p className="text-xs text-muted mb-3">
                                                Tags control which products this customer can add to orders. If none selected, they see all products.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {allTags.map((t: any) => (
                                                    <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTags.includes(t.id)}
                                                            onChange={() => toggleTag(t.id)}
                                                            className="w-4 h-4 rounded"
                                                        />
                                                        <span className="text-sm">{t.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="flex gap-3 justify-end mt-4">
                                    <button onClick={() => setShowDefaultsModal(null)} className="btn btn-ghost">Cancel</button>
                                    <button onClick={handleSaveDefaults} className="btn btn-primary">
                                        <Check size={16} /> Save
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '900px' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2"><Upload size={18} /> Bulk Upload Customers</h3>
                            <button onClick={() => setShowBulkModal(false)} className="text-muted hover:text-foreground"><X size={20} /></button>
                        </div>

                        {/* Step 1: Download template */}
                        <div className="mb-4">
                            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">1. Download Template</p>
                            <button onClick={downloadTemplate} className="btn btn-outline btn-sm">
                                <Upload size={14} /> Download Template (.xlsx)
                            </button>
                            <p className="text-xs text-muted mt-1">Columns: Name (required), Email (required), Password (required), Delivery Address, Point of Contact, Contact Number, Delivery Time</p>
                        </div>

                        {/* Step 2: Upload file */}
                        <div className="mb-4">
                            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">2. Upload Filled File</p>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleBulkFileChange}
                                className="text-sm"
                            />
                        </div>

                        {bulkError && (
                            <div className="mb-3 p-2 rounded-lg badge-danger text-sm flex items-center gap-2">
                                <AlertCircle size={14} /> {bulkError}
                            </div>
                        )}

                        {bulkResult && (
                            <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }}>
                                ✓ Created {bulkResult.inserted} customer(s).{' '}
                                {bulkRows.length - bulkResult.inserted > 0 && `${bulkRows.length - bulkResult.inserted} skipped (duplicate or missing required fields).`}
                                {bulkResult.errors.length > 0 && (
                                    <div className="mt-2 max-h-24 overflow-y-auto text-xs text-danger">
                                        {bulkResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Preview */}
                        {bulkRows.length > 0 && !bulkResult && (() => {
                            const existingEmails = new Set(customers.map((c) => c.email.toLowerCase()));
                            const newCount = bulkRows.filter((r) => r.name && r.email && r.password && !existingEmails.has(r.email.toLowerCase())).length;
                            const skipCount = bulkRows.length - newCount;
                            return (
                                <>
                                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                                        3. Review & Confirm ({bulkRows.length} rows)
                                    </p>
                                    {skipCount > 0 && (
                                        <div className="mb-2 p-2 rounded text-xs" style={{ background: '#fef3c7', color: '#92400e' }}>
                                            {skipCount} row(s) will be skipped (duplicate email or missing required fields).
                                        </div>
                                    )}
                                    <div className="overflow-auto max-h-56 border rounded-lg mb-4">
                                        <table className="data-table text-xs">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Password</th>
                                                    <th>Delivery Address</th>
                                                    <th>Point of Contact</th>
                                                    <th>Contact No.</th>
                                                    <th>Del. Time</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bulkRows.map((r, i) => {
                                                    const isDupe = existingEmails.has(r.email.toLowerCase());
                                                    const isMissing = !r.name || !r.email || !r.password;
                                                    const rowStyle = isDupe || isMissing ? { background: '#fef9c3' } : {};
                                                    return (
                                                        <tr key={i} style={rowStyle}>
                                                            <td>{i + 1}</td>
                                                            <td className="font-medium">{r.name || <span className="text-danger">missing</span>}</td>
                                                            <td>
                                                                {r.email || <span className="text-danger">missing</span>}
                                                                {isDupe && <span className="ml-1 text-warning text-xs">exists ⚠</span>}
                                                            </td>
                                                            <td>{r.password ? '••••••' : <span className="text-danger">missing</span>}</td>
                                                            <td className="text-muted">{r.delivery_address || '—'}</td>
                                                            <td className="text-muted">{r.point_of_contact || '—'}</td>
                                                            <td className="text-muted">{r.contact_number || '—'}</td>
                                                            <td className="text-muted">{r.delivery_time || '—'}</td>
                                                            <td>
                                                                {isDupe ? <span className="badge badge-warning text-xs">skip</span>
                                                                    : isMissing ? <span className="badge badge-danger text-xs">skip</span>
                                                                        : <span className="badge badge-success text-xs">new</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <button onClick={() => setShowBulkModal(false)} className="btn btn-ghost">Close</button>
                                        {newCount > 0 && (
                                            <button onClick={handleBulkUpload} disabled={bulkLoading} className="btn btn-primary">
                                                {bulkLoading ? <><Loader2 className="animate-spin" size={14} /> Uploading...</> : <><Check size={14} /> Upload {newCount} Customer{newCount !== 1 ? 's' : ''}</>}
                                            </button>
                                        )}
                                    </div>
                                </>
                            );
                        })()}

                        {(!bulkRows.length || bulkResult) && (
                            <div className="flex justify-end mt-2">
                                <button onClick={() => setShowBulkModal(false)} className="btn btn-ghost">Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
