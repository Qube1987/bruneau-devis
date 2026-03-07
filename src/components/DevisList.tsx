import React, { useState, useEffect } from 'react';
import { FileText, Calendar, User, Eye, Trash2, Plus, Link as LinkIcon, CheckCircle, Clock, Package, Search, X } from 'lucide-react';
import { useDevis } from '../hooks/useDevis';
import { Devis } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getDevisPublicUrl } from '../lib/token-utils';
import StockModal from './StockModal';
import { useStock, DevisLine } from '../hooks/useStock';

interface DevisListProps {
  onLoadDevis: (devis: Devis) => void;
  onNewDevis: () => void;
}

export const DevisList: React.FC<DevisListProps> = ({ onLoadDevis, onNewDevis }) => {
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const { getDevisList, deleteDevis, loading } = useDevis();
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockData, setStockData] = useState<any[]>([]);
  const { fetchStockForDevis, loading: stockLoading } = useStock();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDevisList = devisList.filter(devis => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const clientName = `${devis.client.prenom} ${devis.client.nom}`.toLowerCase();
    const devisNumber = (devis.devis_number || '').toLowerCase();
    const titre = (devis.titre_affaire || '').toLowerCase();
    const statusLabels: Record<string, string> = { draft: 'brouillon', sent: 'envoyé', signed: 'signé' };
    const statusLabel = (statusLabels[devis.status] || '').toLowerCase();
    return clientName.includes(term) || devisNumber.includes(term) || titre.includes(term) || statusLabel.includes(term);
  });

  useEffect(() => {
    loadDevisList();
  }, []);

  const loadDevisList = async () => {
    const result = await getDevisList();
    if (result.success && result.devis) {
      setDevisList(result.devis);
    }
  };

  const handleDeleteDevis = async (devis: Devis) => {
    if (!devis.id) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer le devis "${devis.titre_affaire}" ?`)) {
      const result = await deleteDevis(devis.id);

      if (result.success) {
        await loadDevisList();
      } else {
        alert(result.error || 'Erreur lors de la suppression du devis');
      }
    }
  };

  const handleCopyLink = async (token: string) => {
    const url = getDevisPublicUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      alert('Lien copié dans le presse-papier !');
    } catch (error) {
      prompt('Copiez ce lien :', url);
    }
  };

  const handleViewStock = async (devis: Devis) => {
    const devisLines: DevisLine[] = devis.lignes.map(line => ({
      designation: line.name,
      ref_extrabat: line.ref_extrabat || null,
      quantite: line.quantity
    }));

    try {
      const data = await fetchStockForDevis(devisLines);
      setStockData(data);
      setShowStockModal(true);
    } catch (error) {
      console.error('Error fetching stock:', error);
      alert('Erreur lors de la récupération des données de stock');
    }
  };

  const hasStockReferences = (devis: Devis) => {
    return devis.lignes.some(line => line.ref_extrabat);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-800' },
      signed: { label: 'Signé', color: 'bg-green-100 text-green-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29235C] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des devis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#29235C] flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Mes devis
            </h2>
            <button
              onClick={onNewDevis}
              className="flex items-center gap-2 px-4 py-2 bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau devis
            </button>
          </div>
        </div>

        {/* Search field */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un devis (nom, numéro, titre...)"
              className="w-full pl-10 pr-10 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-transparent text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {filteredDevisList.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Aucun résultat' : 'Aucun devis trouvé'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm
                  ? `Aucun devis ne correspond à "${searchTerm}"`
                  : 'Commencez par créer votre premier devis'}
              </p>
              {!searchTerm && (
                <button
                  onClick={onNewDevis}
                  className="flex items-center gap-2 px-6 py-3 bg-[#29235C] text-white rounded-lg hover:bg-[#1f1a4d] transition-colors mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Créer un devis
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDevisList.map((devis) => (
                <div key={devis.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {devis.devis_number && <span className="text-[#29235C]">{devis.devis_number} - </span>}
                          {devis.titre_affaire}
                        </h3>
                        {getStatusBadge(devis.status)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{devis.client.prenom} {devis.client.nom}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {devis.updated_at
                              ? format(new Date(devis.updated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })
                              : 'Date inconnue'
                            }
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          {devis.lignes.length} article{devis.lignes.length > 1 ? 's' : ''}
                        </span>
                        <span className="font-semibold text-[#29235C]">
                          {devis.totaux.ttc.toFixed(2)} € TTC
                        </span>
                      </div>

                      {devis.accepted_status === 'accepted' && devis.accepted_at && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <span>Accepté le {format(new Date(devis.accepted_at), 'dd/MM/yyyy', { locale: fr })}</span>
                        </div>
                      )}

                      {devis.accepted_status === 'pending' && devis.access_token && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>En attente d'acceptation</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleViewStock(devis)}
                        disabled={!hasStockReferences(devis) || stockLoading}
                        className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-2 min-h-[44px] text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!hasStockReferences(devis) ? "Aucune référence stock associée" : "Voir le stock"}
                      >
                        <Package className="w-5 h-5" />
                        <span>Stock</span>
                      </button>

                      {devis.access_token && (
                        <button
                          onClick={() => handleCopyLink(devis.access_token!)}
                          className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-2 min-h-[44px] text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Copier le lien de visualisation"
                        >
                          <LinkIcon className="w-5 h-5" />
                          <span>Lien</span>
                        </button>
                      )}

                      <button
                        onClick={() => onLoadDevis(devis)}
                        className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-2 min-h-[44px] text-[#29235C] border border-[#29235C] rounded-lg hover:bg-[#29235C] hover:text-white transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                        <span>Ouvrir</span>
                      </button>

                      <button
                        onClick={() => {
                          handleDeleteDevis(devis);
                        }}
                        className="p-3 min-w-[44px] min-h-[44px] text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <StockModal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        stockData={stockData}
        loading={stockLoading}
      />
    </div>
  );
};