import React from 'react';
import { X, Package, AlertCircle } from 'lucide-react';
import { StockComparisonLine } from '../hooks/useStock';

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockData: StockComparisonLine[];
  loading: boolean;
}

export default function StockModal({ isOpen, onClose, stockData, loading }: StockModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Consultation du stock</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left p-3 font-semibold text-gray-700">Désignation (devis)</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Réf. Extrabat</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Qté demandée</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Désignation (stock)</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Qté disponible</th>
                    <th className="text-center p-3 font-semibold text-gray-700">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((line, index) => (
                    <React.Fragment key={index}>
                      <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">{line.devisDesignation}</td>
                        <td className="p-3 text-gray-600">
                          {line.refExtrabat || (
                            <span className="flex items-center gap-1 text-gray-400">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm">Non renseignée</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-semibold text-gray-900">{line.quantiteDemandee}</td>
                        <td className="p-3 text-gray-600">
                          {line.refExtrabat && line.stockEntries.length === 0 ? (
                            <span className="text-sm text-gray-400">Non référencé</span>
                          ) : line.stockEntries.length > 0 ? (
                            <span className="text-sm text-gray-500">
                              {line.stockEntries.length} variante{line.stockEntries.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {line.refExtrabat && line.stockEntries.length === 0 ? (
                            <span className="text-sm text-gray-400">Non référencé</span>
                          ) : line.stockEntries.length > 0 ? (
                            <span className="font-semibold text-gray-900">
                              {line.totalStock}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${line.status.color}`}>
                            {line.status.label}
                          </span>
                        </td>
                      </tr>
                      {line.stockEntries.length > 0 && line.stockEntries.map((entry, entryIndex) => (
                        <tr key={`${index}-${entryIndex}`} className="border-b border-gray-100 bg-gray-50">
                          <td className="p-3 pl-8" colSpan={3}></td>
                          <td className="p-3 text-gray-700 text-sm pl-8">
                            <span className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              {entry.designation}
                            </span>
                          </td>
                          <td className="p-3 text-right text-gray-700 text-sm">{entry.quantite}</td>
                          <td className="p-3"></td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span>
                <span className="text-gray-600">Stock suffisant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></span>
                <span className="text-gray-600">Stock partiel</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span>
                <span className="text-gray-600">Rupture</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></span>
                <span className="text-gray-600">Non référencé</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
