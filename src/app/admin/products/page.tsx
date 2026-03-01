'use client';

import { useState, useEffect, useMemo } from 'react';
import { getProducts, createProduct, updateProduct, toggleProductStatus } from '@/actions/products';
import { Package, Plus, Edit, ToggleLeft, ToggleRight, Loader2, X, Check, GripVertical, Search } from 'lucide-react';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (statusFilter === 'active' && !p.active_status) return false;
            if (statusFilter === 'inactive' && p.active_status) return false;
            return true;
        });
    }, [products, searchQuery, statusFilter]);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const prods = await getProducts();
        setProducts(prods);
        setLoading(false);
    }

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        const formData = new FormData(e.currentTarget);
        const result = await createProduct(formData);
        if (result.error) {
            setFormError(result.error);
        } else {
            setShowCreateModal(false);
            loadData();
        }
        setFormLoading(false);
    }

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const result = await updateProduct(showEditModal.id, formData);
        if (result.error) {
            setFormError(result.error);
        } else {
            setShowEditModal(null);
            loadData();
        }
        setFormLoading(false);
    }

    async function handleToggle(id: string) {
        await toggleProductStatus(id);
        loadData();
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-primary" size={36} />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Package size={24} className="text-primary" />
                        Product Management
                    </h1>
                    <p className="text-muted text-sm mt-1">
                        {products.filter((p) => p.active_status).length} active of {products.length} total
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="form-input pl-9 py-2 text-sm"
                            style={{ minWidth: '220px' }}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="form-input py-2 text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <button onClick={() => { setShowCreateModal(true); setFormError(''); }} className="btn btn-primary btn-sm">
                        <Plus size={16} /> Add Product
                    </button>
                </div>
            </div>

            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }}>Order</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map((p, index) => (
                            <tr key={p.id} className={!p.active_status ? 'opacity-50' : ''}>
                                <td className="text-center text-muted font-mono text-sm">{index + 1}</td>
                                <td className="font-bold">{p.name}</td>
                                <td>
                                    <span className={`badge ${p.active_status ? 'badge-success' : 'badge-danger'}`}>
                                        {p.active_status ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="text-muted text-sm">{new Date(p.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => { setShowEditModal(p); setFormError(''); }} className="btn btn-ghost btn-sm" title="Edit">
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleToggle(p.id)}
                                            className={`btn btn-ghost btn-sm ${p.active_status ? 'text-success' : 'text-danger'}`}
                                            title={p.active_status ? 'Deactivate' : 'Activate'}
                                        >
                                            {p.active_status ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredProducts.length === 0 && (
                    <div className="p-8 text-center text-muted">No products found.</div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '420px' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Add Product</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-foreground"><X size={20} /></button>
                        </div>
                        {formError && <div className="mb-3 p-2 rounded-lg badge-danger text-sm">{formError}</div>}
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Product Name</label>
                                <input name="name" required className="form-input" placeholder="e.g. White Bread Loaf" />
                            </div>
                            <div className="flex gap-3 justify-end mt-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost">Cancel</button>
                                <button type="submit" disabled={formLoading} className="btn btn-primary">
                                    {formLoading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Add
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '420px' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Edit Product</h3>
                            <button onClick={() => setShowEditModal(null)} className="text-muted hover:text-foreground"><X size={20} /></button>
                        </div>
                        {formError && <div className="mb-3 p-2 rounded-lg badge-danger text-sm">{formError}</div>}
                        <form onSubmit={handleUpdate}>
                            <div className="form-group">
                                <label className="form-label">Product Name</label>
                                <input name="name" required className="form-input" defaultValue={showEditModal.name} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select name="active_status" className="form-input" defaultValue={String(showEditModal.active_status)}>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
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
        </div>
    );
}
