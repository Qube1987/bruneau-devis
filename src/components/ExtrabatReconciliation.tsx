import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Search, Check, AlertTriangle, X, Package, RefreshCw, ExternalLink, Loader2, Save } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { Product } from '../types';
import { supabase } from '../lib/supabase';

interface ExtrabatArticle {
    id: number;
    code: string;
    libelle?: string;
    label?: string;
    description?: string;
    prix?: number;
    prixVente?: number;
    puht?: number;
    price?: number;
    categorie?: string;
    category?: string;
    [key: string]: any;
}

type TabType = 'missing' | 'all';

export const ExtrabatReconciliation: React.FC = () => {
    const { products, loading: productsLoading, updateProduct, fetchProducts } = useProducts();
    const [activeTab, setActiveTab] = useState<TabType>('missing');
    const [searchingProductId, setSearchingProductId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [extrabatResults, setExtrabatResults] = useState<ExtrabatArticle[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [editingRefId, setEditingRefId] = useState<string | null>(null);
    const [manualRef, setManualRef] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);
    const [filterQuery, setFilterQuery] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Products without extrabat ref
    const missingProducts = products.filter(p => !p.ref_extrabat || p.ref_extrabat.trim() === '');
    const linkedProducts = products.filter(p => p.ref_extrabat && p.ref_extrabat.trim() !== '');

    const displayedProducts = activeTab === 'missing' ? missingProducts : products;
    const filteredProducts = displayedProducts.filter(p => {
        if (!filterQuery.trim()) return true;
        const q = filterQuery.toLowerCase();
        return (
            p.name.toLowerCase().includes(q) ||
            p.reference.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.ref_extrabat && p.ref_extrabat.toLowerCase().includes(q))
        );
    });

    // Auto-dismiss success message
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Search Extrabat articles
    const searchExtrabat = useCallback(async (query: string) => {
        if (!query.trim()) {
            setExtrabatResults([]);
            return;
        }

        setSearchLoading(true);
        setSearchError(null);

        try {
            const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
                body: {
                    endpoint: 'articles',
                    params: {
                        q: query,
                        nbitem: 20,
                    }
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            if (!data.success) {
                throw new Error(data.error || 'Erreur API Extrabat');
            }

            // Handle various response formats
            let articles: ExtrabatArticle[] = [];
            if (Array.isArray(data.data)) {
                articles = data.data;
            } else if (data.data && Array.isArray(data.data.data)) {
                articles = data.data.data;
            } else if (data.data && typeof data.data === 'object') {
                // Try to find an array in the response
                const keys = Object.keys(data.data);
                for (const key of keys) {
                    if (Array.isArray(data.data[key])) {
                        articles = data.data[key];
                        break;
                    }
                }
            }

            setExtrabatResults(articles);
        } catch (error) {
            console.error('Extrabat search error:', error);
            setSearchError(error instanceof Error ? error.message : 'Erreur de recherche');
            setExtrabatResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    // Save ref_extrabat for a product
    const saveRefExtrabat = async (productId: string, refExtrabat: string) => {
        setSavingId(productId);
        try {
            const result = await updateProduct(productId, { ref_extrabat: refExtrabat.trim() });
            if (result.success) {
                setSuccessMessage(`Code Extrabat "${refExtrabat.trim()}" enregistré avec succès !`);
                setEditingRefId(null);
                setManualRef('');
                setSearchingProductId(null);
                setExtrabatResults([]);
                setSearchQuery('');
            } else {
                alert(result.error || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            alert('Erreur lors de la sauvegarde du code Extrabat');
        } finally {
            setSavingId(null);
        }
    };

    // Select an Extrabat article and save it
    const selectExtrabatArticle = (article: ExtrabatArticle) => {
        if (!searchingProductId) return;
        const code = article.code || String(article.id);
        saveRefExtrabat(searchingProductId, code);
    };

    // Get article display name
    const getArticleName = (article: ExtrabatArticle): string => {
        return article.libelle || article.label || article.description || `Article #${article.id}`;
    };

    // Get article price
    const getArticlePrice = (article: ExtrabatArticle): number | null => {
        return article.prixVente ?? article.prix ?? article.puht ?? article.price ?? null;
    };

    // Get article code
    const getArticleCode = (article: ExtrabatArticle): string => {
        return article.code || String(article.id);
    };

    // Open search panel for a product
    const openSearch = (product: Product) => {
        setSearchingProductId(product.id);
        setSearchQuery(product.name);
        setExtrabatResults([]);
        setSearchError(null);
        setEditingRefId(null);
    };

    if (productsLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29235C] mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des produits...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4">
            {/* Success toast */}
            {successMessage && (
                <div className="fixed top-20 right-4 z-50 animate-slide-in">
                    <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
                        <Check className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">{successMessage}</p>
                        <button
                            onClick={() => setSuccessMessage(null)}
                            className="ml-auto p-1 hover:bg-green-700 rounded transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-[#29235C] flex items-center gap-2">
                                <Link2 className="w-6 h-6" />
                                Réconciliation Extrabat
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                Associez vos produits à leurs codes articles Extrabat
                            </p>
                        </div>
                        <button
                            onClick={() => fetchProducts()}
                            className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualiser
                        </button>
                    </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 border-b border-gray-100">
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-4 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90 font-medium">Sans code Extrabat</p>
                                <p className="text-3xl font-bold mt-1">{missingProducts.length}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 opacity-75" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90 font-medium">Avec code Extrabat</p>
                                <p className="text-3xl font-bold mt-1">{linkedProducts.length}</p>
                            </div>
                            <Check className="w-8 h-8 opacity-75" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#29235C] to-[#3d3580] text-white p-4 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90 font-medium">Total produits</p>
                                <p className="text-3xl font-bold mt-1">{products.length}</p>
                            </div>
                            <Package className="w-8 h-8 opacity-75" />
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>Progression de la réconciliation</span>
                        <span className="font-semibold text-[#29235C]">
                            {products.length > 0 ? Math.round((linkedProducts.length / products.length) * 100) : 0}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${products.length > 0 ? (linkedProducts.length / products.length) * 100 : 0}%`,
                                background: `linear-gradient(90deg, #29235C, #E72C63)`
                            }}
                        />
                    </div>
                </div>

                {/* Tabs & filter */}
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('missing')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'missing'
                                ? 'bg-white text-[#29235C] shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Sans code ({missingProducts.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'all'
                                ? 'bg-white text-[#29235C] shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            <Package className="w-4 h-4" />
                            Tous ({products.length})
                        </button>
                    </div>

                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Filtrer les produits..."
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 min-h-[40px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-[#29235C] transition-colors text-sm"
                        />
                    </div>
                </div>

                {/* Product list */}
                <div className="divide-y divide-gray-100">
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            {activeTab === 'missing' && missingProducts.length === 0 ? (
                                <>
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Tous les produits sont réconciliés ! 🎉
                                    </h3>
                                    <p className="text-gray-500">
                                        Chaque produit a un code Extrabat associé.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
                                    <p className="text-gray-500">Essayez de modifier votre filtre de recherche.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        filteredProducts.map(product => (
                            <div key={product.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                                    {/* Product info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-3">
                                            <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${product.ref_extrabat ? 'bg-green-500' : 'bg-red-500'
                                                }`} />
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{product.name}</p>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <span className="text-xs font-mono text-gray-500">{product.reference}</span>
                                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                                        {product.category}
                                                    </span>
                                                    {product.ref_extrabat && (
                                                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                                                            <ExternalLink className="w-3 h-3" />
                                                            {product.ref_extrabat}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-5 lg:ml-0">
                                        {/* Manual edit inline */}
                                        {editingRefId === product.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={manualRef}
                                                    onChange={(e) => setManualRef(e.target.value)}
                                                    placeholder="Code Extrabat..."
                                                    className="w-40 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-[#29235C]"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && manualRef.trim()) {
                                                            saveRefExtrabat(product.id, manualRef);
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setEditingRefId(null);
                                                            setManualRef('');
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (manualRef.trim()) {
                                                            saveRefExtrabat(product.id, manualRef);
                                                        }
                                                    }}
                                                    disabled={!manualRef.trim() || savingId === product.id}
                                                    className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Enregistrer"
                                                >
                                                    {savingId === product.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Save className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingRefId(null);
                                                        setManualRef('');
                                                    }}
                                                    className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                                                    title="Annuler"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setEditingRefId(product.id);
                                                        setManualRef(product.ref_extrabat || '');
                                                        setSearchingProductId(null);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                                    title="Saisir manuellement le code"
                                                >
                                                    <Save className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Saisir</span>
                                                </button>
                                                <button
                                                    onClick={() => openSearch(product)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-sm bg-[#29235C] text-white rounded-lg hover:bg-[#1f1a4d] transition-colors"
                                                    title="Rechercher sur Extrabat"
                                                >
                                                    <Search className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Chercher</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Extrabat search panel */}
                                {searchingProductId === product.id && (
                                    <div className="mt-4 ml-5 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                        <div className="p-4 border-b border-gray-200 bg-white">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-[#29235C] flex items-center gap-2">
                                                    <Search className="w-4 h-4" />
                                                    Rechercher sur Extrabat
                                                </h4>
                                                <button
                                                    onClick={() => {
                                                        setSearchingProductId(null);
                                                        setExtrabatResults([]);
                                                        setSearchQuery('');
                                                        setSearchError(null);
                                                    }}
                                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                >
                                                    <X className="w-4 h-4 text-gray-500" />
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Nom du produit sur Extrabat..."
                                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-[#29235C]"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            searchExtrabat(searchQuery);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => searchExtrabat(searchQuery)}
                                                    disabled={searchLoading || !searchQuery.trim()}
                                                    className="flex items-center gap-2 px-4 py-2 min-h-[40px] bg-[#E72C63] text-white text-sm rounded-lg hover:bg-[#d12656] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {searchLoading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Search className="w-4 h-4" />
                                                    )}
                                                    Rechercher
                                                </button>
                                            </div>
                                        </div>

                                        {/* Search results */}
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {searchError && (
                                                <div className="p-4 text-center">
                                                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                                    <p className="text-sm text-red-600">{searchError}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Vérifiez la connexion à l'API Extrabat</p>
                                                </div>
                                            )}

                                            {!searchLoading && !searchError && extrabatResults.length === 0 && searchQuery && (
                                                <div className="p-6 text-center text-gray-500">
                                                    <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                    <p className="text-sm">Cliquez sur "Rechercher" pour lancer la recherche</p>
                                                </div>
                                            )}

                                            {searchLoading && (
                                                <div className="p-6 text-center">
                                                    <Loader2 className="w-8 h-8 text-[#29235C] animate-spin mx-auto mb-2" />
                                                    <p className="text-sm text-gray-600">Recherche en cours sur Extrabat...</p>
                                                </div>
                                            )}

                                            {!searchLoading && extrabatResults.length > 0 && (
                                                <div className="divide-y divide-gray-100">
                                                    <div className="px-4 py-2 bg-gray-100/50 text-xs text-gray-500 font-medium">
                                                        {extrabatResults.length} résultat(s) trouvé(s)
                                                    </div>
                                                    {extrabatResults.map((article, index) => {
                                                        const articleCode = getArticleCode(article);
                                                        const articleName = getArticleName(article);
                                                        const articlePrice = getArticlePrice(article);

                                                        return (
                                                            <button
                                                                key={article.id || index}
                                                                onClick={() => selectExtrabatArticle(article)}
                                                                disabled={savingId !== null}
                                                                className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-50 transition-colors group disabled:opacity-50"
                                                            >
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#29235C]">
                                                                        {articleName}
                                                                    </p>
                                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                        <span className="text-xs font-mono px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded">
                                                                            {articleCode}
                                                                        </span>
                                                                        {articlePrice !== null && (
                                                                            <span className="text-xs text-gray-500">
                                                                                {articlePrice.toFixed(2)} € HT
                                                                            </span>
                                                                        )}
                                                                        {(article.categorie || article.category) && (
                                                                            <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                                                                                {article.categorie || article.category}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <div className="flex items-center gap-1 px-2 py-1 bg-[#29235C] text-white text-xs rounded-lg">
                                                                        <Check className="w-3 h-3" />
                                                                        Sélectionner
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Animation styles */}
            <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
        </div>
    );
};
