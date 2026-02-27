import React, { useState, useMemo } from 'react';
import { Plus, Minus, Search, Package, Euro, Info, ChevronDown, ChevronRight, ChevronLeft, X, Play } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { Product } from '../types';

interface ProductWithMedia extends Product {
  media_items?: Array<{
    id: string;
    media_type: 'image' | 'video';
    file_path: string;
    thumbnail_path?: string;
    display_order: number;
    title?: string;
  }>;
}

interface ProductCatalogProps {
  onAddProduct: (product: Product, quantity: number) => void;
  currentLines: any[];
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ onAddProduct, currentLines }) => {
  const { products, categories, loading, getProductImageUrl, getPublicUrlForStoragePath } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithMedia | null>(null);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.reference.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, Product[]>();
    filteredProducts.forEach(product => {
      const categoryProducts = grouped.get(product.category) || [];
      categoryProducts.push(product);
      grouped.set(product.category, categoryProducts);
    });
    return grouped;
  }, [filteredProducts]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Get current quantity for a product from devis lines
  const getCurrentQuantity = (productId: string) => {
    const existingLine = currentLines.find(line => line.product?.id === productId);
    return existingLine ? existingLine.quantity : 0;
  };

  // Get quantity from local state or current devis
  const getDisplayQuantity = (productId: string) => {
    return quantities[productId] || getCurrentQuantity(productId) || 0;
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setQuantities(prev => ({
      ...prev,
      [productId]: newQuantity
    }));
  };

  const handleAddProduct = (product: Product, quantity: number) => {
    onAddProduct(product, quantity);
    setSelectedProduct(null);
  };

  const getProductMedia = (product: ProductWithMedia) => {
    const media: Array<{ type: 'image' | 'video'; url: string; thumbnailUrl?: string; title?: string }> = [];

    if (product.media_items && product.media_items.length > 0) {
      product.media_items.forEach((item) => {
        const url = getPublicUrlForStoragePath(item.file_path);
        const thumbnailUrl = item.thumbnail_path ? getPublicUrlForStoragePath(item.thumbnail_path) : undefined;
        if (url) {
          media.push({
            type: item.media_type,
            url: url,
            thumbnailUrl: thumbnailUrl,
            title: item.title
          });
        }
      });
    } else {
      if (product.photo_square_path) {
        const url = getPublicUrlForStoragePath(product.photo_square_path);
        if (url) media.push({ type: 'image', url });
      }

      if (product.photo_path && product.photo_path !== product.photo_square_path) {
        const url = getPublicUrlForStoragePath(product.photo_path);
        if (url) media.push({ type: 'image', url });
      }
    }

    return media;
  };

  const handleOpenProductModal = (product: ProductWithMedia) => {
    setSelectedProduct(product);
    setCurrentMediaIndex(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Chargement du catalogue...</p>
        </div>
      </div>
    );
  }

  const renderProductCard = (product: Product) => {
    const imageUrl = getProductImageUrl(product);
    const currentQuantity = getDisplayQuantity(product.id);

    return (
      <div key={product.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-square bg-gray-50 relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <button
            onClick={() => handleOpenProductModal(product as ProductWithMedia)}
            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
          >
            <Info className="w-4 h-4 text-[#29235C]" />
          </button>
        </div>

        <div className="p-3">
          <p className="text-xs text-gray-500 mb-1">{product.reference}</p>
          <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2">{product.name}</h4>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-1">
              <Euro className="w-3 h-3 text-gray-500" />
              <span className="text-sm font-semibold text-[#29235C]">{product.price_ht.toFixed(2)}</span>
              <span className="text-xs text-gray-500">HT</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            {currentQuantity > 0 ? (
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => {
                    const newQuantity = currentQuantity - 1;
                    updateQuantity(product.id, newQuantity);
                    handleAddProduct(product, newQuantity);
                  }}
                  className="p-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-medium min-w-[20px] text-center">{currentQuantity}</span>
                <button
                  onClick={() => {
                    const newQuantity = currentQuantity + 1;
                    updateQuantity(product.id, newQuantity);
                    handleAddProduct(product, newQuantity);
                  }}
                  className="p-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  updateQuantity(product.id, 1);
                  handleAddProduct(product, 1);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] transition-colors text-xs"
              >
                <Plus className="w-3 h-3" />
                Ajouter
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-[#29235C] mb-4">Catalogue produits</h3>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories Accordion */}
      <div className="divide-y">
        {Array.from(productsByCategory.entries()).map(([category, categoryProducts]) => {
          const isExpanded = expandedCategories.has(category);
          const productsInCategory = categoryProducts.length;

          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-[#29235C]" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900">{category}</span>
                  <span className="text-sm text-gray-500">({productsInCategory})</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 py-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4">
                    {categoryProducts.map(product => renderProductCard(product))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {productsByCategory.size === 0 && (
          <div className="text-center py-8">
            <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Aucun produit trouvé</p>
          </div>
        )}
      </div>

      {/* Product Details Modal with Media Carousel */}
      {selectedProduct && (() => {
        const media = getProductMedia(selectedProduct);
        const currentMedia = media[currentMediaIndex];

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-[#29235C]">Détails du produit</h3>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setCurrentMediaIndex(0);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                {/* Media Carousel */}
                {media.length > 0 ? (
                  <div className="space-y-4">
                    {/* Main Media Display */}
                    <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden">
                      {currentMedia.type === 'image' ? (
                        <img
                          src={currentMedia.url}
                          alt={currentMedia.title || selectedProduct.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="relative w-full h-full">
                          <video
                            controls
                            className="w-full h-full object-contain"
                            src={currentMedia.url}
                          >
                            Votre navigateur ne supporte pas la lecture de vidéos.
                          </video>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Play className="w-16 h-16 text-white/80" />
                          </div>
                        </div>
                      )}

                      {/* Navigation Arrows */}
                      {media.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentMediaIndex(prev => prev === 0 ? media.length - 1 : prev - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5 text-[#29235C]" />
                          </button>
                          <button
                            onClick={() => setCurrentMediaIndex(prev => prev === media.length - 1 ? 0 : prev + 1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
                          >
                            <ChevronRight className="w-5 h-5 text-[#29235C]" />
                          </button>
                        </>
                      )}

                      {/* Media Counter */}
                      {media.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 text-white text-sm rounded-full">
                          {currentMediaIndex + 1} / {media.length}
                        </div>
                      )}
                    </div>

                    {/* Thumbnails */}
                    {media.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {media.map((item, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentMediaIndex(index)}
                            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                              currentMediaIndex === index
                                ? 'border-[#E72C63] ring-2 ring-[#E72C63]/30'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {item.type === 'image' ? (
                              <img
                                src={item.thumbnailUrl || item.url}
                                alt={`${selectedProduct.name} ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                <Play className="w-6 h-6 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}

                {/* Product Details */}
                <div className="mt-6 space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Référence</p>
                    <p className="font-medium">{selectedProduct.reference}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Nom</p>
                    <p className="font-medium">{selectedProduct.name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Fonction</p>
                    <p>{selectedProduct.description_short}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-sm whitespace-pre-line">
                      {selectedProduct.description_long || selectedProduct.description_short}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Prix HT</p>
                    <p className="text-xl font-semibold text-[#29235C]">{selectedProduct.price_ht.toFixed(2)} €</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const currentQty = getCurrentQuantity(selectedProduct.id);
                    const newQty = currentQty > 0 ? currentQty : 1;
                    updateQuantity(selectedProduct.id, newQty);
                    handleAddProduct(selectedProduct, newQty);
                  }}
                  className="w-full mt-6 bg-[#E72C63] text-white py-3 rounded-lg font-medium hover:bg-[#d12656] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {getCurrentQuantity(selectedProduct.id) > 0 ? 'Ajouter au devis' : 'Ajouter au devis'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};