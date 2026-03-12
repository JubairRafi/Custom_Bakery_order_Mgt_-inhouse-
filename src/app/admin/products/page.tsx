'use client';

import { useState, useEffect, useRef } from 'react';
import { getProducts, getProductsPaginated, createProduct, updateProduct, toggleProductStatus, bulkCreateProducts, bulkDeleteProducts } from '@/actions/products';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/actions/categories';
import { getTags, createTag, deleteTag, getProductTags, setProductTags } from '@/actions/tags';
import { Package, Plus, Edit, ToggleLeft, ToggleRight, Loader2, X, Check, Search, Tag, FolderOpen, Trash2, Upload, Download, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    // Product modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [selectedProductTags, setSelectedProductTags] = useState<string[]>([]);
    const [cutoffEnabled, setCutoffEnabled] = useState(false);
    const [cutoffHours, setCutoffHours] = useState('12');

    // Manage-categories modal
    const [showCategoriesModal, setShowCategoriesModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [catFormLoading, setCatFormLoading] = useState(false);
    const [catFormError, setCatFormError] = useState('');

    // Manage-tags modal
    const [showTagsModal, setShowTagsModal] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [tagFormLoading, setTagFormLoading] = useState(false);
    const [tagFormError, setTagFormError] = useState('');

    // Bulk upload modal
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkRows, setBulkRows] = useState<{ name: string; category: string; active: string; tags: string; weight: string; minimum_order: string; risk_number: string; yield_amount: string; yield_unit: string; allergens: string; ingredient: string; product_code: string; image_url: string }[]>([]);
    const [bulkError, setBulkError] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkResult, setBulkResult] = useState<{ inserted: number; skipped: number } | null>(null);

    // Multi-select delete
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [tagFilter, setTagFilter] = useState('all');
    const activeFilters = useRef<any>({});

    // Load categories and tags once on mount
    useEffect(() => {
        Promise.all([getCategories(), getTags()]).then(([cats, tgs]) => {
            setCategories(cats);
            setTags(tgs);
        });
    }, []);

    // Server-side filter effect — search only commits on Enter, dropdowns fire immediately
    useEffect(() => {
        const filters = {
            search: searchQuery || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
            tag_id: tagFilter !== 'all' ? tagFilter : undefined,
        };
        loadData(filters);
    }, [searchQuery, statusFilter, categoryFilter, tagFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    async function loadData(filters: any = {}) {
        setLoading(true);
        activeFilters.current = filters;
        const result = await getProductsPaginated(1, 50, filters);
        setProducts(result.data);
        setTotalCount(result.count);
        setHasMore(result.hasMore);
        setPage(1);
        setLoading(false);
    }

    async function loadMore() {
        setLoadingMore(true);
        const next = page + 1;
        const result = await getProductsPaginated(next, 50, activeFilters.current);
        setProducts(prev => { const ids = new Set(prev.map((p: any) => p.id)); return [...prev, ...result.data.filter((p: any) => !ids.has(p.id))]; });
        setTotalCount(result.count);
        setHasMore(result.hasMore);
        setPage(next);
        setLoadingMore(false);
    }

    // ── Product create ─────────────────────────────────────────────────────

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        const formData = new FormData(e.currentTarget);
        const result = await createProduct(formData);
        if (result.error) {
            setFormError(result.error);
            setFormLoading(false);
            return;
        }
        if (result.id && selectedProductTags.length > 0) {
            await setProductTags(result.id, selectedProductTags);
        }
        setShowCreateModal(false);
        setSelectedProductTags([]);
        loadData(activeFilters.current);
        setFormLoading(false);
    }

    // ── Product edit ───────────────────────────────────────────────────────

    async function openEditModal(product: any) {
        setShowEditModal(product);
        setFormError('');
        setCutoffEnabled(!!product.cutoff_hours);
        setCutoffHours(String(product.cutoff_hours ?? 12));
        const tagIds = await getProductTags(product.id);
        setSelectedProductTags(tagIds);
    }

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        const formData = new FormData(e.currentTarget);
        const [updateResult] = await Promise.all([
            updateProduct(showEditModal.id, formData),
            setProductTags(showEditModal.id, selectedProductTags),
        ]);
        if (updateResult.error) {
            setFormError(updateResult.error);
            setFormLoading(false);
            return;
        }
        setShowEditModal(null);
        setSelectedProductTags([]);
        loadData(activeFilters.current);
        setFormLoading(false);
    }

    async function handleToggle(id: string) {
        await toggleProductStatus(id);
        loadData(activeFilters.current);
    }

    function toggleProductTag(tagId: string) {
        setSelectedProductTags((prev) =>
            prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
        );
    }

    // ── Multi-select delete ────────────────────────────────────────────────

    function toggleSelect(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        if (products.length > 0 && products.every((p) => selectedIds.has(p.id))) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(products.map((p) => p.id)));
        }
    }

    async function handleDeleteSelected() {
        if (!confirm(`Delete ${selectedIds.size} product(s)? This cannot be undone.`)) return;
        setDeleteLoading(true);
        await bulkDeleteProducts(Array.from(selectedIds));
        setSelectedIds(new Set());
        loadData(activeFilters.current);
        setDeleteLoading(false);
    }

    // ── Category management ────────────────────────────────────────────────

    async function handleCreateCategory(e: React.FormEvent) {
        e.preventDefault();
        setCatFormLoading(true);
        setCatFormError('');
        const fd = new FormData();
        fd.set('name', newCategoryName);
        const result = await createCategory(fd);
        if (result.error) { setCatFormError(result.error); setCatFormLoading(false); return; }
        setNewCategoryName('');
        const cats = await getCategories();
        setCategories(cats);
        setCatFormLoading(false);
    }

    async function handleUpdateCategory(e: React.FormEvent) {
        e.preventDefault();
        setCatFormLoading(true);
        setCatFormError('');
        const fd = new FormData();
        fd.set('name', editingCategory.name);
        const result = await updateCategory(editingCategory.id, fd);
        if (result.error) { setCatFormError(result.error); setCatFormLoading(false); return; }
        setEditingCategory(null);
        const cats = await getCategories();
        setCategories(cats);
        setCatFormLoading(false);
    }

    async function handleDeleteCategory(id: string) {
        await deleteCategory(id);
        const cats = await getCategories();
        setCategories(cats);
        loadData(activeFilters.current);
    }

    // ── Tag management ─────────────────────────────────────────────────────

    async function handleCreateTag(e: React.FormEvent) {
        e.preventDefault();
        setTagFormLoading(true);
        setTagFormError('');
        const fd = new FormData();
        fd.set('name', newTagName);
        const result = await createTag(fd);
        if (result.error) { setTagFormError(result.error); setTagFormLoading(false); return; }
        setNewTagName('');
        const tgs = await getTags();
        setTags(tgs);
        setTagFormLoading(false);
    }

    async function handleDeleteTag(id: string) {
        await deleteTag(id);
        const tgs = await getTags();
        setTags(tgs);
        loadData(activeFilters.current);
    }

    // ── Bulk upload ────────────────────────────────────────────────────────

    function downloadTemplate() {
        const tagNames = tags.map((t: any) => t.name).join(', ');
        const catNames = categories.map((c: any) => c.name).join(', ');
        const ws = XLSX.utils.aoa_to_sheet([
            ['Name', 'Category', 'Active', 'Tags', 'Weight', 'Minimum Order', 'Risk Number', 'Yield Amount', 'Yield Unit', 'Allergens', 'Ingredient', 'Product Code', 'Image URL'],
            ['Brown Sourdough 150gr', 'Bread', 'Yes', 'Wholesale', '150', '20', '1', '1', 'piece', 'Gluten', '', 'BRB5150', ''],
            ['Fruit Bread 500gr', 'Bread', 'Yes', 'Kings Road, St Martin', '500', '1', '1', '1', 'piece', 'Gluten, Nuts, Sulphites', '', 'BRF5500', ''],
            ['Seed Bread 350gr', 'Bread', 'Yes', '', '350', '1', '1', '1', 'piece', 'Gluten, Sesame', '', 'BRB350', ''],
            [],
            ['── Reference ──────────────────────────────────────────────────────────'],
            [`Available categories: ${catNames || 'none yet'}`],
            [`Available tags (comma-separate multiple): ${tagNames || 'none yet'}`],
        ]);
        ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 14 }, { wch: 40 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
        XLSX.writeFile(wb, 'product_upload_template.xlsx');
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setBulkError('');
        setBulkResult(null);
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(ev.target?.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                const rows = raw.slice(1)
                    .filter((r) => String(r[0] ?? '').trim() && !String(r[0]).startsWith('──'))
                    .map((r) => ({
                        name: String(r[0] ?? '').trim(),
                        category: String(r[1] ?? '').trim(),
                        active: String(r[2] ?? 'Yes').trim(),
                        tags: String(r[3] ?? '').trim(),
                        weight: String(r[4] ?? '').trim(),
                        minimum_order: String(r[5] ?? '').trim(),
                        risk_number: String(r[6] ?? '').trim(),
                        yield_amount: String(r[7] ?? '').trim(),
                        yield_unit: String(r[8] ?? '').trim(),
                        allergens: String(r[9] ?? '').trim(),
                        ingredient: String(r[10] ?? '').trim(),
                        product_code: String(r[11] ?? '').trim(),
                        image_url: String(r[12] ?? '').trim(),
                    }));
                if (rows.length === 0) {
                    setBulkError('No valid rows found. Make sure the file has product names in column A.');
                    return;
                }
                setBulkRows(rows);
            } catch {
                setBulkError('Could not read file. Please use the provided .xlsx template.');
            }
        };
        reader.readAsBinaryString(file);
    }

    async function handleBulkUpload() {
        setBulkLoading(true);
        setBulkError('');

        const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
        const tagMap = new Map(tags.map((t: any) => [t.name.toLowerCase(), t.id]));
        const existingNames = new Set(products.map((p) => p.name.toLowerCase()));

        const toInsert = bulkRows
            .filter((r) => !existingNames.has(r.name.toLowerCase()))
            .map((r) => ({
                name: r.name,
                category_id: catMap.get(r.category.toLowerCase()) ?? null,
                active_status: r.active.toLowerCase() !== 'no',
                tag_ids: r.tags
                    ? r.tags.split(',').map((t) => t.trim()).filter(Boolean)
                        .map((name) => tagMap.get(name.toLowerCase()))
                        .filter((id): id is string => Boolean(id))
                    : [],
                weight: r.weight || null,
                minimum_order: r.minimum_order ? parseInt(r.minimum_order, 10) : null,
                risk_number: r.risk_number || null,
                yield_amount: r.yield_amount ? parseFloat(r.yield_amount) : null,
                yield_unit: r.yield_unit || null,
                allergens: r.allergens || null,
                ingredient: r.ingredient || null,
                product_code: r.product_code || null,
                image_url: r.image_url || null,
            }));

        const skipped = bulkRows.length - toInsert.length;
        const result = await bulkCreateProducts(toInsert);
        if (result.error) {
            setBulkError(result.error);
        } else {
            setBulkResult({ inserted: result.inserted, skipped });
            setBulkRows([]);
            loadData(activeFilters.current);
        }
        setBulkLoading(false);
    }

    // ── Render ─────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-primary" size={36} />
            </div>
        );
    }

    const allFilteredSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

    return (
        <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>
            {/* ── Page header ──────────────────────────────────────────── */}
            <div className="shrink-0 pb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Package size={24} className="text-primary" />
                            Product Management
                        </h1>
                        <p className="text-muted text-sm mt-1">
                            {products.filter((p) => p.active_status).length} active of {products.length} total
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search products... (press Enter)"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') setSearchQuery(searchInput); }}
                                className="form-input text-sm"
                                style={{ minWidth: '220px', paddingLeft: '36px' }}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="form-input py-1.5 text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        {categories.length > 0 && (
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="form-input py-1.5 text-sm"
                            >
                                <option value="all">All Categories</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                        {tags.length > 0 && (
                            <select
                                value={tagFilter}
                                onChange={(e) => setTagFilter(e.target.value)}
                                className="form-input py-1.5 text-sm"
                            >
                                <option value="all">All Tags</option>
                                {tags.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        )}
                        <button onClick={() => { setShowCategoriesModal(true); setCatFormError(''); setEditingCategory(null); }} className="btn btn-outline btn-sm">
                            <FolderOpen size={15} /> Categories
                        </button>
                        <button onClick={() => { setShowTagsModal(true); setTagFormError(''); }} className="btn btn-outline btn-sm">
                            <Tag size={15} /> Tags
                        </button>
                        <button onClick={() => { setShowBulkModal(true); setBulkRows([]); setBulkError(''); setBulkResult(null); }} className="btn btn-outline btn-sm">
                            <Upload size={15} /> Bulk Upload
                        </button>
                        {selectedIds.size > 0 && (
                            <button onClick={handleDeleteSelected} disabled={deleteLoading} className="btn btn-sm bg-red-600 text-white hover:bg-red-700">
                                {deleteLoading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                Delete ({selectedIds.size})
                            </button>
                        )}
                        <button onClick={() => { setShowCreateModal(true); setFormError(''); setSelectedProductTags([]); setCutoffEnabled(false); setCutoffHours('12'); }} className="btn btn-primary btn-sm">
                            <Plus size={16} /> Add Product
                        </button>
                    </div>
                </div>
            </div>

            <div className="card flex-1 overflow-auto min-h-0">
                <table className="data-table">
                    <thead className="sticky top-0 z-[5]">
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={allFilteredSelected}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded"
                                    title="Select all"
                                />
                            </th>
                            <th style={{ width: '50px' }}>#</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Tags</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p, index) => (
                            <tr key={p.id} className={`${!p.active_status ? 'opacity-50' : ''} ${selectedIds.has(p.id) ? 'bg-blue-50' : ''}`}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(p.id)}
                                        onChange={() => toggleSelect(p.id)}
                                        className="w-4 h-4 rounded"
                                    />
                                </td>
                                <td className="text-center text-muted font-mono text-sm">{index + 1}</td>
                                <td className="font-bold">{p.name}</td>
                                <td className="text-sm text-muted">{p.category?.name ?? '—'}</td>
                                <td>
                                    {p.tags && p.tags.length > 0
                                        ? <div className="flex flex-wrap gap-1">
                                            {p.tags.map((t: any) => (
                                                <span key={t.id} className="badge badge-info text-xs">{t.name}</span>
                                            ))}
                                        </div>
                                        : <span className="text-muted text-sm">—</span>
                                    }
                                </td>
                                <td>
                                    <span className={`badge ${p.active_status ? 'badge-success' : 'badge-danger'}`}>
                                        {p.active_status ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="text-muted text-sm">{new Date(p.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => openEditModal(p)} className="btn btn-ghost btn-sm" title="Edit">
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
                {products.length === 0 && (
                    <div className="p-8 text-center text-muted">No products found.</div>
                )}
            </div>

            {hasMore && (
                <div className="flex justify-center mt-4">
                    <button onClick={loadMore} disabled={loadingMore} className="btn btn-outline btn-sm">
                        {loadingMore && <Loader2 size={14} className="animate-spin" />}
                        {loadingMore ? 'Loading...' : `Load More (${totalCount - products.length} remaining)`}
                    </button>
                </div>
            )}

            {/* ── Create Product Modal ─────────────────────────────────── */}
            {showCreateModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select name="category_id" className="form-input">
                                    <option value="">— No category —</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            {tags.length > 0 && (
                                <div className="form-group">
                                    <label className="form-label">Tags</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {tags.map((t) => (
                                            <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProductTags.includes(t.id)}
                                                    onChange={() => toggleProductTag(t.id)}
                                                    className="w-4 h-4 rounded"
                                                />
                                                <span className="text-sm">{t.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={cutoffEnabled} onChange={e => setCutoffEnabled(e.target.checked)} className="w-4 h-4 rounded" />
                                    <span className="form-label mb-0">Product-specific cutoff</span>
                                </label>
                                {cutoffEnabled && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            name="cutoff_hours"
                                            type="number"
                                            min="1"
                                            max="168"
                                            value={cutoffHours}
                                            onChange={e => setCutoffHours(e.target.value)}
                                            className="form-input"
                                            style={{ width: '100px' }}
                                        />
                                        <span className="text-sm text-muted">hours before delivery</span>
                                    </div>
                                )}
                            </div>

                            <div className="border-t pt-4 mt-2">
                                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Product Details</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="form-group">
                                        <label className="form-label">Weight</label>
                                        <input name="weight" className="form-input" placeholder="e.g. 500g" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Minimum Order</label>
                                        <input name="minimum_order" type="number" min="0" className="form-input" placeholder="e.g. 10" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Risk Number</label>
                                        <input name="risk_number" className="form-input" placeholder="e.g. 1" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Product Code</label>
                                        <input name="product_code" className="form-input" placeholder="e.g. BRB5150" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Yield Amount</label>
                                        <input name="yield_amount" type="number" min="0" step="any" className="form-input" placeholder="e.g. 1" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Yield Unit</label>
                                        <input name="yield_unit" className="form-input" placeholder="e.g. piece" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Allergens</label>
                                    <input name="allergens" className="form-input" placeholder="e.g. Gluten, Nuts" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ingredient</label>
                                    <textarea name="ingredient" className="form-input" rows={2} placeholder="e.g. Flour, Water, Salt..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Image URL</label>
                                    <input name="image_url" className="form-input" placeholder="https://..." />
                                </div>
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

            {/* ── Edit Product Modal ───────────────────────────────────── */}
            {showEditModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                                <label className="form-label">Category</label>
                                <select name="category_id" className="form-input" defaultValue={showEditModal.category_id ?? ''}>
                                    <option value="">— No category —</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            {tags.length > 0 && (
                                <div className="form-group">
                                    <label className="form-label">Tags</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {tags.map((t) => (
                                            <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProductTags.includes(t.id)}
                                                    onChange={() => toggleProductTag(t.id)}
                                                    className="w-4 h-4 rounded"
                                                />
                                                <span className="text-sm">{t.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select name="active_status" className="form-input" defaultValue={String(showEditModal.active_status)}>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={cutoffEnabled} onChange={e => setCutoffEnabled(e.target.checked)} className="w-4 h-4 rounded" />
                                    <span className="form-label mb-0">Product-specific cutoff</span>
                                </label>
                                {cutoffEnabled && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            name="cutoff_hours"
                                            type="number"
                                            min="1"
                                            max="168"
                                            value={cutoffHours}
                                            onChange={e => setCutoffHours(e.target.value)}
                                            className="form-input"
                                            style={{ width: '100px' }}
                                        />
                                        <span className="text-sm text-muted">hours before delivery</span>
                                    </div>
                                )}
                            </div>

                            <div className="border-t pt-4 mt-2">
                                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Product Details</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="form-group">
                                        <label className="form-label">Weight</label>
                                        <input name="weight" className="form-input" defaultValue={showEditModal.weight ?? ''} placeholder="e.g. 500g" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Minimum Order</label>
                                        <input name="minimum_order" type="number" min="0" className="form-input" defaultValue={showEditModal.minimum_order ?? ''} placeholder="e.g. 10" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Risk Number</label>
                                        <input name="risk_number" className="form-input" defaultValue={showEditModal.risk_number ?? ''} placeholder="e.g. 1" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Product Code</label>
                                        <input name="product_code" className="form-input" defaultValue={showEditModal.product_code ?? ''} placeholder="e.g. BRB5150" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Yield Amount</label>
                                        <input name="yield_amount" type="number" min="0" step="any" className="form-input" defaultValue={showEditModal.yield_amount ?? ''} placeholder="e.g. 1" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Yield Unit</label>
                                        <input name="yield_unit" className="form-input" defaultValue={showEditModal.yield_unit ?? ''} placeholder="e.g. piece" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Allergens</label>
                                    <input name="allergens" className="form-input" defaultValue={showEditModal.allergens ?? ''} placeholder="e.g. Gluten, Nuts" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ingredient</label>
                                    <textarea name="ingredient" className="form-input" rows={2} defaultValue={showEditModal.ingredient ?? ''} placeholder="e.g. Flour, Water, Salt..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Image URL</label>
                                    <input name="image_url" className="form-input" defaultValue={showEditModal.image_url ?? ''} placeholder="https://..." />
                                </div>
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

            {/* ── Manage Categories Modal ──────────────────────────────── */}
            {showCategoriesModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '440px' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2"><FolderOpen size={18} /> Manage Categories</h3>
                            <button onClick={() => setShowCategoriesModal(false)} className="text-muted hover:text-foreground"><X size={20} /></button>
                        </div>
                        {catFormError && <div className="mb-3 p-2 rounded-lg badge-danger text-sm">{catFormError}</div>}

                        <form onSubmit={handleCreateCategory} className="flex gap-2 mb-4">
                            <input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="New category name"
                                required
                                className="form-input flex-1 text-sm py-2"
                            />
                            <button type="submit" disabled={catFormLoading} className="btn btn-primary btn-sm">
                                {catFormLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
                            </button>
                        </form>

                        <div className="space-y-1 max-h-64 overflow-y-auto">
                            {categories.length === 0 && <p className="text-muted text-sm text-center py-4">No categories yet.</p>}
                            {categories.map((c) => (
                                <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                                    {editingCategory?.id === c.id ? (
                                        <form onSubmit={handleUpdateCategory} className="flex items-center gap-2 flex-1">
                                            <input
                                                value={editingCategory.name}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                className="form-input flex-1 text-sm py-1"
                                                autoFocus
                                            />
                                            <button type="submit" disabled={catFormLoading} className="btn btn-primary btn-sm">
                                                <Check size={13} />
                                            </button>
                                            <button type="button" onClick={() => setEditingCategory(null)} className="btn btn-ghost btn-sm">
                                                <X size={13} />
                                            </button>
                                        </form>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-sm font-medium">{c.name}</span>
                                            <button onClick={() => setEditingCategory(c)} className="btn btn-ghost btn-sm" title="Rename">
                                                <Edit size={13} />
                                            </button>
                                            <button onClick={() => handleDeleteCategory(c.id)} className="btn btn-ghost btn-sm text-danger" title="Delete">
                                                <Trash2 size={13} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end mt-4">
                            <button onClick={() => setShowCategoriesModal(false)} className="btn btn-ghost">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Manage Tags Modal ────────────────────────────────────── */}
            {showTagsModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '440px' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2"><Tag size={18} /> Manage Tags</h3>
                            <button onClick={() => setShowTagsModal(false)} className="text-muted hover:text-foreground"><X size={20} /></button>
                        </div>
                        {tagFormError && <div className="mb-3 p-2 rounded-lg badge-danger text-sm">{tagFormError}</div>}

                        <form onSubmit={handleCreateTag} className="flex gap-2 mb-4">
                            <input
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                placeholder="New tag name"
                                required
                                className="form-input flex-1 text-sm py-2"
                            />
                            <button type="submit" disabled={tagFormLoading} className="btn btn-primary btn-sm">
                                {tagFormLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
                            </button>
                        </form>

                        <div className="space-y-1 max-h-64 overflow-y-auto">
                            {tags.length === 0 && <p className="text-muted text-sm text-center py-4">No tags yet.</p>}
                            {tags.map((t) => (
                                <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                                    <span className="flex-1 text-sm font-medium">
                                        <span className="badge badge-info">{t.name}</span>
                                    </span>
                                    <button onClick={() => handleDeleteTag(t.id)} className="btn btn-ghost btn-sm text-danger" title="Delete">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted mt-3">Deleting a tag removes it from all products and customers.</p>
                        <div className="flex justify-end mt-4">
                            <button onClick={() => setShowTagsModal(false)} className="btn btn-ghost">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk Upload Modal ────────────────────────────────────── */}
            {showBulkModal && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '680px' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2"><Upload size={18} /> Bulk Upload Products</h3>
                            <button onClick={() => setShowBulkModal(false)} className="text-muted hover:text-foreground"><X size={20} /></button>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 mb-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium">1. Download the template</p>
                                <p className="text-xs text-muted mt-0.5">Fill in: <strong>Name</strong> (required), Category, Active, Tags, Weight, Min Order, Risk No., Yield Amount/Unit, Allergens, Ingredient, Product Code, Image URL</p>
                            </div>
                            <button onClick={downloadTemplate} className="btn btn-outline btn-sm whitespace-nowrap">
                                <Download size={14} /> Template
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm font-medium mb-2">2. Upload your filled file (.xlsx or .xls)</p>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50 cursor-pointer"
                            />
                        </div>

                        {bulkError && (
                            <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" /> {bulkError}
                            </div>
                        )}

                        {bulkResult && (
                            <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
                                ✓ Added {bulkResult.inserted} product{bulkResult.inserted !== 1 ? 's' : ''}.
                                {bulkResult.skipped > 0 && ` ${bulkResult.skipped} skipped (already exist).`}
                            </div>
                        )}

                        {bulkRows.length > 0 && !bulkResult && (() => {
                            const existingNames = new Set(products.map((p) => p.name.toLowerCase()));
                            const dupeCount = bulkRows.filter((r) => existingNames.has(r.name.toLowerCase())).length;
                            const newCount = bulkRows.length - dupeCount;
                            return (
                                <>
                                    <p className="text-sm font-medium mb-1">3. Review &amp; confirm ({bulkRows.length} rows)</p>
                                    {dupeCount > 0 && (
                                        <div className="flex items-center gap-2 mb-2 text-amber-700 bg-amber-50 rounded-lg px-3 py-2 text-xs">
                                            <AlertCircle size={14} className="shrink-0" />
                                            {dupeCount} row{dupeCount !== 1 ? 's' : ''} already exist and will be skipped.
                                        </div>
                                    )}
                                    <div className="border rounded-lg overflow-hidden mb-4">
                                        <div className="max-h-56 overflow-y-auto">
                                            <table className="data-table text-sm">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Name</th>
                                                        <th>Category</th>
                                                        <th>Tags</th>
                                                        <th>Active</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {bulkRows.map((r, i) => {
                                                        const isDuplicate = existingNames.has(r.name.toLowerCase());
                                                        const catMatched = !r.category || categories.some(
                                                            (c) => c.name.toLowerCase() === r.category.toLowerCase()
                                                        );
                                                        const tagNames = r.tags
                                                            ? r.tags.split(',').map((t) => t.trim()).filter(Boolean)
                                                            : [];
                                                        return (
                                                            <tr key={i} className={isDuplicate ? 'bg-amber-50' : ''}>
                                                                <td className="text-muted">{i + 1}</td>
                                                                <td className={isDuplicate ? 'text-amber-600 font-medium' : 'font-medium'}>
                                                                    {r.name}
                                                                    {isDuplicate && <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">exists ⚠</span>}
                                                                </td>
                                                                <td>
                                                                    {r.category
                                                                        ? catMatched
                                                                            ? <span>{r.category}</span>
                                                                            : <span className="text-orange-500">{r.category} ⚠</span>
                                                                        : <span className="text-muted">—</span>
                                                                    }
                                                                </td>
                                                                <td>
                                                                    {tagNames.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {tagNames.map((name) => {
                                                                                const ok = tags.some((t: any) => t.name.toLowerCase() === name.toLowerCase());
                                                                                return (
                                                                                    <span key={name} className={`text-xs px-1.5 py-0.5 rounded ${ok ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-600'}`}>
                                                                                        {name}{!ok && ' ⚠'}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : <span className="text-muted">—</span>}
                                                                </td>
                                                                <td>{r.active.toLowerCase() === 'no'
                                                                    ? <span className="badge badge-danger">Inactive</span>
                                                                    : <span className="badge badge-success">Active</span>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <button onClick={() => setShowBulkModal(false)} className="btn btn-ghost">Close</button>
                                        {newCount > 0 && (
                                            <button onClick={handleBulkUpload} disabled={bulkLoading} className="btn btn-primary">
                                                {bulkLoading
                                                    ? <><Loader2 size={15} className="animate-spin" /> Uploading...</>
                                                    : <><Upload size={15} /> Upload {newCount} Products</>
                                                }
                                            </button>
                                        )}
                                    </div>
                                </>
                            );
                        })()}

                        {(!bulkRows.length || bulkResult) && (
                            <div className="flex justify-end">
                                <button onClick={() => setShowBulkModal(false)} className="btn btn-ghost">Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
