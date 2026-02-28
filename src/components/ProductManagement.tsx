import React, { useState, useEffect } from 'react';
import { Plus, Package, Save, X, Upload, Euro, Tag, FileText, Image as ImageIcon, Video, Trash2, ChevronUp, ChevronDown, Play, Check } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { Product } from '../types';
import { supabase } from '../lib/supabase';

interface MediaLibraryItem {
  id: string;
  file_path: string;
  thumbnail_path?: string;
  file_hash: string;
  file_size: number;
  original_filename: string;
  media_type: 'image' | 'video';
}

interface MediaItem {
  id: string;
  product_id: string;
  media_library_id: string | null;
  media_type: 'image' | 'video';
  file_path: string;
  thumbnail_path?: string;
  display_order: number;
}

interface ProductWithMedia extends Product {
  media_items?: MediaItem[];
}

export const ProductManagement: React.FC = () => {
  const { products, categories, loading, addProduct, getPublicUrlForStoragePath, fetchProducts } = useProducts();
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProductForMedia, setSelectedProductForMedia] = useState<ProductWithMedia | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [libraryMedia, setLibraryMedia] = useState<MediaLibraryItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [initialSelectedMediaIds, setInitialSelectedMediaIds] = useState<Set<string>>(new Set());
  const [savingMediaChanges, setSavingMediaChanges] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    reference: '',
    name: '',
    category: '',
    description_short: '',
    description_long: '',
    price_ht: 0,
    default_vat_rate: 20,
    is_active: true,
    proposer_en_option: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProduct.reference || !newProduct.name || !newProduct.category || !newProduct.description_short) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);

    try {
      const result = await addProduct(newProduct as Omit<Product, 'id'>);

      if (result.success) {
        // Reset form
        setNewProduct({
          reference: '',
          name: '',
          category: '',
          description_short: '',
          description_long: '',
          price_ht: 0,
          default_vat_rate: 20,
          is_active: true,
          proposer_en_option: false
        });
        setShowAddForm(false);
        alert('Produit ajouté avec succès !');
      } else {
        alert(result.error || 'Erreur lors de l\'ajout du produit');
      }
    } catch (error) {
      alert('Erreur lors de l\'ajout du produit');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setNewProduct({
      reference: '',
      name: '',
      category: '',
      description_short: '',
      description_long: '',
      price_ht: 0,
      default_vat_rate: 20,
      is_active: true,
      proposer_en_option: false
    });
  };

  const loadMediaForProduct = async (product: ProductWithMedia) => {
    setLoadingMedia(true);
    setSelectedProductForMedia(product);

    try {
      const [productMediaResult, libraryResult] = await Promise.all([
        supabase
          .from('product_media')
          .select('*')
          .eq('product_id', product.id)
          .order('display_order', { ascending: true }),
        supabase
          .from('media_library')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (productMediaResult.error) throw productMediaResult.error;
      if (libraryResult.error) throw libraryResult.error;

      setMediaItems(productMediaResult.data || []);
      setLibraryMedia(libraryResult.data || []);

      const usedMediaIds = new Set(
        (productMediaResult.data || [])
          .filter(m => m.media_library_id)
          .map(m => m.media_library_id as string)
      );
      setSelectedMediaIds(usedMediaIds);
      setInitialSelectedMediaIds(new Set(usedMediaIds));
    } catch (error) {
      console.error('Error loading media:', error);
      alert('Erreur lors du chargement des médias');
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleToggleMedia = (libraryItem: MediaLibraryItem) => {
    const isSelected = selectedMediaIds.has(libraryItem.id);

    setSelectedMediaIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.delete(libraryItem.id);
      } else {
        newSet.add(libraryItem.id);
      }
      return newSet;
    });
  };

  const handleSaveMediaChanges = async () => {
    if (!selectedProductForMedia) return;

    setSavingMediaChanges(true);

    try {
      // Médias à retirer
      const toRemove = Array.from(initialSelectedMediaIds).filter(id => !selectedMediaIds.has(id));

      // Médias à ajouter
      const toAdd = Array.from(selectedMediaIds).filter(id => !initialSelectedMediaIds.has(id));

      // Retirer les médias désélectionnés
      for (const mediaLibraryId of toRemove) {
        const mediaToRemove = mediaItems.find(m => m.media_library_id === mediaLibraryId);
        if (mediaToRemove) {
          const { error } = await supabase
            .from('product_media')
            .delete()
            .eq('id', mediaToRemove.id);

          if (error) throw error;
        }
      }

      // Ajouter les nouveaux médias
      for (const mediaLibraryId of toAdd) {
        const libraryItem = libraryMedia.find(m => m.id === mediaLibraryId);
        if (!libraryItem) continue;

        const nextOrder = mediaItems.length > 0 ? Math.max(...mediaItems.map(m => m.display_order)) + 1 : 0;

        const { error } = await supabase
          .from('product_media')
          .insert({
            product_id: selectedProductForMedia.id,
            media_library_id: libraryItem.id,
            media_type: libraryItem.media_type,
            file_path: libraryItem.file_path,
            thumbnail_path: libraryItem.thumbnail_path,
            display_order: nextOrder
          });

        if (error) throw error;
      }

      // Recharger les médias du produit
      await loadMediaForProduct(selectedProductForMedia);
      await fetchProducts();

      alert(`${toAdd.length} média(s) ajouté(s), ${toRemove.length} média(s) retiré(s)`);
    } catch (error) {
      console.error('Error saving media changes:', error);
      alert('Erreur lors de la sauvegarde des modifications');
    } finally {
      setSavingMediaChanges(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Retirer ce média du produit ?')) return;

    try {
      const mediaToDelete = mediaItems.find(m => m.id === mediaId);

      const { error } = await supabase
        .from('product_media')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      if (mediaToDelete?.media_library_id) {
        setSelectedMediaIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(mediaToDelete.media_library_id as string);
          return newSet;
        });
        setInitialSelectedMediaIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(mediaToDelete.media_library_id as string);
          return newSet;
        });
      }

      setMediaItems(prev => prev.filter(m => m.id !== mediaId));
      await fetchProducts();
    } catch (error) {
      console.error('Error removing media:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleReorderMedia = async (mediaId: string, direction: 'up' | 'down') => {
    const currentIndex = mediaItems.findIndex(m => m.id === mediaId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= mediaItems.length) return;

    const newMediaItems = [...mediaItems];
    [newMediaItems[currentIndex], newMediaItems[newIndex]] = [newMediaItems[newIndex], newMediaItems[currentIndex]];

    newMediaItems.forEach((item, index) => {
      item.display_order = index;
    });

    setMediaItems(newMediaItems);

    try {
      for (const item of newMediaItems) {
        await supabase
          .from('product_media')
          .update({ display_order: item.display_order })
          .eq('id', item.id);
      }

      await fetchProducts();
    } catch (error) {
      console.error('Error reordering media:', error);
      alert('Erreur lors de la réorganisation des médias');
    }
  };

  const closeMediaModal = () => {
    setSelectedProductForMedia(null);
    setMediaItems([]);
    setSelectedMediaIds(new Set());
    setInitialSelectedMediaIds(new Set());
  };

  if (loading) {
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
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#29235C] flex items-center gap-2">
              <Package className="w-6 h-6" />
              Gestion des produits
            </h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Ajouter un produit</span>
              <span className="sm:hidden">Ajouter</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#29235C] text-white p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total produits</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
                <Package className="w-8 h-8 opacity-75" />
              </div>
            </div>

            <div className="bg-[#E72C63] text-white p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Catégories</p>
                  <p className="text-2xl font-bold">{categories.length}</p>
                </div>
                <Tag className="w-8 h-8 opacity-75" />
              </div>
            </div>

            <div className="bg-green-600 text-white p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Produits actifs</p>
                  <p className="text-2xl font-bold">{products.filter(p => p.is_active).length}</p>
                </div>
                <Package className="w-8 h-8 opacity-75" />
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 border-b font-medium text-gray-700">Référence</th>
                  <th className="text-left p-3 border-b font-medium text-gray-700">Nom</th>
                  <th className="text-left p-3 border-b font-medium text-gray-700">Catégorie</th>
                  <th className="text-left p-3 border-b font-medium text-gray-700">Prix HT</th>
                  <th className="text-left p-3 border-b font-medium text-gray-700">TVA</th>
                  <th className="text-left p-3 border-b font-medium text-gray-700">Statut</th>
                  <th className="text-left p-3 border-b font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr key={product.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 border-b text-sm font-mono">{product.reference}</td>
                    <td className="p-3 border-b">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{product.description_short}</p>
                      </div>
                    </td>
                    <td className="p-3 border-b">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-3 border-b font-semibold text-[#29235C]">
                      {product.price_ht.toFixed(2)} €
                    </td>
                    <td className="p-3 border-b text-sm">{product.default_vat_rate}%</td>
                    <td className="p-3 border-b">
                      <span className={`px-2 py-1 text-xs rounded-full ${product.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {product.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="p-3 border-b">
                      <button
                        onClick={() => loadMediaForProduct(product as ProductWithMedia)}
                        className="flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] bg-[#29235C] text-white text-sm rounded-lg hover:bg-[#1f1a4d] transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>Médias</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {products.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
              <p className="text-gray-600 mb-6">Commencez par ajouter votre premier produit</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-[#29235C] text-white rounded-lg hover:bg-[#1f1a4d] transition-colors mx-auto"
              >
                <Plus className="w-5 h-5" />
                Ajouter un produit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#29235C] flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Ajouter un nouveau produit
              </h3>
              <button
                onClick={handleCancel}
                className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProduct.reference || ''}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, reference: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                    placeholder="Ex: AJ-HUB-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProduct.category || ''}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                    placeholder="Ex: Centrales d'alarme"
                    list="categories"
                    required
                  />
                  <datalist id="categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du produit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProduct.name || ''}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                  placeholder="Ex: Hub 2 Plus - Centrale d'alarme Ajax"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description courte <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProduct.description_short || ''}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description_short: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                  placeholder="Description courte pour les devis"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description détaillée
                </label>
                <textarea
                  value={newProduct.description_long || ''}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description_long: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                  placeholder="Description détaillée du produit"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix HT (€) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Euro className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProduct.price_ht || ''}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, price_ht: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-10 pr-3 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taux TVA (%)
                  </label>
                  <select
                    value={newProduct.default_vat_rate || 20}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, default_vat_rate: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent"
                  >
                    <option value={20}>20%</option>
                    <option value={10}>10%</option>
                    <option value={5.5}>5.5%</option>
                    <option value={2.1}>2.1%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newProduct.is_active || false}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-[#29235C] rounded focus:ring-[#29235C]"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Produit actif (visible dans le catalogue)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="proposer_en_option"
                  checked={newProduct.proposer_en_option || false}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, proposer_en_option: e.target.checked }))}
                  className="w-4 h-4 text-[#E72C63] rounded focus:ring-[#E72C63]"
                />
                <label htmlFor="proposer_en_option" className="text-sm text-gray-700">
                  Proposer en option dans les devis en ligne
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 min-h-[44px] text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Ajout en cours...' : 'Ajouter le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Management Modal */}
      {selectedProductForMedia && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-semibold text-[#29235C] flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Gestion des médias
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedProductForMedia.name} - {selectedProductForMedia.reference}
                </p>
              </div>
              <button
                onClick={closeMediaModal}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {loadingMedia ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29235C] mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bibliothèque de médias */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        Bibliothèque ({libraryMedia.length} médias disponibles)
                      </h4>
                      {(() => {
                        const hasChanges = Array.from(selectedMediaIds).sort().join(',') !==
                          Array.from(initialSelectedMediaIds).sort().join(',');

                        const toAdd = Array.from(selectedMediaIds).filter(id => !initialSelectedMediaIds.has(id)).length;
                        const toRemove = Array.from(initialSelectedMediaIds).filter(id => !selectedMediaIds.has(id)).length;

                        return hasChanges && (
                          <button
                            onClick={handleSaveMediaChanges}
                            disabled={savingMediaChanges}
                            className="flex items-center justify-center gap-1 px-4 py-2 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Check className="w-5 h-5" />
                            <span className="font-medium">
                              {savingMediaChanges ? 'Enregistrement...' : `Valider (${toAdd > 0 ? `+${toAdd}` : ''}${toAdd > 0 && toRemove > 0 ? ' ' : ''}${toRemove > 0 ? `-${toRemove}` : ''})`}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50">
                      {libraryMedia.length > 0 ? (
                        libraryMedia.map((item) => {
                          const isSelected = selectedMediaIds.has(item.id);
                          const mediaUrl = getPublicUrlForStoragePath(item.file_path);

                          return (
                            <button
                              key={item.id}
                              onClick={() => handleToggleMedia(item)}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg border-2 transition-all ${isSelected
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-white hover:border-[#29235C]'
                                }`}
                            >
                              {/* Checkbox */}
                              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300'
                                }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>

                              {/* Thumbnail */}
                              <div className="w-16 h-16 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                                {item.media_type === 'image' ? (
                                  <img
                                    src={mediaUrl}
                                    alt={item.original_filename}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                    <Video className="w-6 h-6 text-white" />
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {item.original_filename}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  {item.media_type === 'image' ? (
                                    <span className="flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3" />
                                      Image
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Video className="w-3 h-3" />
                                      Vidéo
                                    </span>
                                  )}
                                  <span>•</span>
                                  <span>{(item.file_size / 1024 / 1024).toFixed(1)} MB</span>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-center py-8">
                          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Aucun média dans la bibliothèque</p>
                          <p className="text-xs text-gray-500 mt-1">Allez dans "Bibliothèque" pour uploader des médias</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Médias sélectionnés pour ce produit */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Médias du produit ({mediaItems.length})
                    </h4>
                    {mediaItems.length > 0 ? (
                      <div className="max-h-[60vh] overflow-y-auto space-y-2">
                        {mediaItems.map((media, index) => {
                          const mediaUrl = getPublicUrlForStoragePath(media.file_path);

                          return (
                            <div key={media.id} className="flex items-center gap-3 p-2 bg-white border rounded-lg">
                              {/* Thumbnail */}
                              <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0 relative">
                                {media.media_type === 'image' ? (
                                  <img
                                    src={mediaUrl}
                                    alt="Media"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                    <Video className="w-6 h-6 text-white" />
                                  </div>
                                )}
                                {index === 0 && (
                                  <div className="absolute inset-0 bg-[#E72C63]/80 flex items-center justify-center">
                                    <span className="text-white text-[10px] font-bold">PRINCIPALE</span>
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  Ordre: {index + 1}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {media.media_type === 'image' ? 'Image' : 'Vidéo'}
                                </p>
                              </div>

                              {/* Controls */}
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleReorderMedia(media.id, 'up')}
                                  disabled={index === 0}
                                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Monter"
                                >
                                  <ChevronUp className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleReorderMedia(media.id, 'down')}
                                  disabled={index === mediaItems.length - 1}
                                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Descendre"
                                >
                                  <ChevronDown className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMedia(media.id)}
                                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-red-100 hover:bg-red-200 rounded-lg"
                                  title="Retirer"
                                >
                                  <Trash2 className="w-5 h-5 text-red-700" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800">
                            <strong>Info :</strong> Le premier média est l'image principale du catalogue.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-lg bg-gray-50">
                        <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Aucun média sélectionné</p>
                        <p className="text-xs text-gray-500 mt-1">Cochez des médias dans la bibliothèque</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
};