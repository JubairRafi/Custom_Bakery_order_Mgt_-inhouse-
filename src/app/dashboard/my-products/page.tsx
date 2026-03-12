'use client';

import { useState, useEffect } from 'react';
import { getActiveProductsForCustomer } from '@/actions/tags';
import { Package, Loader2, X, Search } from 'lucide-react';
import { Product } from '@/lib/types';

export default function MyProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    useEffect(() => {
        async function load() {
            const prods = await getActiveProductsForCustomer();
            setProducts(prods);
            setLoading(false);
        }
        load();
    }, []);

    const filtered = products.filter(
        (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
    );

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
                        My Products
                    </h1>
                    <p className="text-muted text-sm mt-1">{products.length} products available</p>
                </div>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-input text-sm"
                        style={{ minWidth: '240px', paddingLeft: '36px' }}
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="card p-12 text-center text-muted">
                    <Package size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No products found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map((product) => (
                        <div
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
                            className="card cursor-pointer hover:border-primary/30 transition-all group"
                            style={{ overflow: 'hidden' }}
                        >
                            <div
                                style={{
                                    height: '160px',
                                    background: product.image_url ? `url(${product.image_url}) center/cover no-repeat` : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {!product.image_url && (
                                    <Package size={40} className="text-muted opacity-30" />
                                )}
                            </div>
                            <div className="p-3">
                                <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                    {product.name}
                                </p>
                                {product.category && (
                                    <p className="text-xs text-muted mt-0.5">{product.category.name}</p>
                                )}
                                {product.weight && (
                                    <p className="text-xs text-muted">{product.weight}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
                    <div className="modal-content" style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">{selectedProduct.name}</h3>
                            <button onClick={() => setSelectedProduct(null)} className="text-muted hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>

                        {selectedProduct.image_url && (
                            <div
                                style={{
                                    height: '220px',
                                    borderRadius: '8px',
                                    background: `url(${selectedProduct.image_url}) center/cover no-repeat`,
                                    marginBottom: '16px',
                                }}
                            />
                        )}

                        <div className="space-y-3">
                            {selectedProduct.category && (
                                <DetailRow label="Category" value={selectedProduct.category.name} />
                            )}
                            {selectedProduct.weight && (
                                <DetailRow label="Weight" value={selectedProduct.weight} />
                            )}
                            {selectedProduct.minimum_order != null && (
                                <DetailRow label="Minimum Order" value={String(selectedProduct.minimum_order)} />
                            )}
                            {selectedProduct.product_code && (
                                <DetailRow label="Product Code" value={selectedProduct.product_code} />
                            )}
                            {selectedProduct.risk_number && (
                                <DetailRow label="Risk Number" value={selectedProduct.risk_number} />
                            )}
                            {(selectedProduct.yield_amount != null || selectedProduct.yield_unit) && (
                                <DetailRow
                                    label="Yield"
                                    value={`${selectedProduct.yield_amount ?? ''} ${selectedProduct.yield_unit ?? ''}`.trim()}
                                />
                            )}
                            {selectedProduct.allergens && (
                                <DetailRow label="Allergens" value={selectedProduct.allergens} highlight />
                            )}
                            {selectedProduct.ingredient && (
                                <DetailRow label="Ingredient" value={selectedProduct.ingredient} />
                            )}
                            {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                                <div className="flex items-start gap-3 py-2 border-b border-border">
                                    <span className="text-xs font-semibold text-muted uppercase w-28 shrink-0 pt-0.5">Tags</span>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedProduct.tags.map((t) => (
                                            <span key={t.id} className="badge badge-info text-xs">{t.name}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end mt-6">
                            <button onClick={() => setSelectedProduct(null)} className="btn btn-ghost">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex items-start gap-3 py-2 border-b border-border">
            <span className="text-xs font-semibold text-muted uppercase w-28 shrink-0">{label}</span>
            <span className={`text-sm ${highlight ? 'font-semibold text-amber-700' : 'text-foreground'}`}>{value}</span>
        </div>
    );
}
