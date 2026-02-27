import React, { useState, useEffect } from 'react';
import { Search, User, Phone, MapPin, Building, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ExtrabatClient {
  nom: string;
  prenom: string;
  email: string;
  id: number;
  civilite: {
    libelle: string;
    id: number;
    ordre: number;
    professionnel: boolean;
  };
  telephones?: Array<{
    id: number;
    number: string;
    type: string;
  }>;
  adresses?: Array<{
    id: number;
    description: string;
    codePostal: string;
    ville: string;
    pays: string;
    type: string;
  }>;
  ouvrage?: Array<{
    id: number;
    libelle: string;
    dateVente: string;
    dateMiseADispo: string;
    article: {
      id: number;
      libelle: string;
      code: string;
      description: string;
    };
    status: {
      label: string;
      order: number;
      archived: boolean;
    };
  }>;
}

interface ClientSearchProps {
  onClientSelect: (client: {
    clientName: string;
    email?: string;
    phone?: string;
    address?: string;
    ouvrageId?: number;
    extrabatClientId: number;
  }) => void;
}

export const ClientSearch: React.FC<ClientSearchProps> = ({ onClientSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<ExtrabatClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ExtrabatClient | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedOuvrage, setSelectedOuvrage] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const searchClients = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setClients([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          endpoint: 'clients',
          params: {
            q: query,
            include: 'telephone,adresse,ouvrage'
          }
        }
      });

      if (error) {
        console.error('Error searching clients:', error);
        return;
      }

      if (data.success) {
        console.log('=== EXTRABAT API RESPONSE ===');
        console.log('Full response:', data.data);
        if (data.data && data.data.length > 0) {
          console.log('First client example:', data.data[0]);
          console.log('Has telephones?', !!data.data[0].telephones);
          console.log('Has adresses?', !!data.data[0].adresses);
          if (data.data[0].telephones) {
            console.log('Telephones data:', data.data[0].telephones);
          }
          if (data.data[0].adresses) {
            console.log('Adresses data:', data.data[0].adresses);
          }
        }
        console.log('=== END RESPONSE ===');
        setClients(data.data || []);
      } else {
        console.error('Extrabat search error:', data.error);
      }
    } catch (err) {
      console.error('Client search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchClients(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClientSelect = (client: ExtrabatClient) => {
    setSelectedClient(client);
    setShowDetails(true);
    
    // Auto-select first available options
    if (client.telephones && client.telephones.length > 0) {
      setSelectedPhone(client.telephones[0].number);
    }
    if (client.adresses && client.adresses.length > 0) {
      const addr = client.adresses[0];
      setSelectedAddress(`${addr.description}, ${addr.codePostal} ${addr.ville}`);
    }
    if (client.ouvrage && client.ouvrage.length > 0) {
      setSelectedOuvrage(client.ouvrage[0].id);
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedClient) return;

    const clientName = `${selectedClient.civilite.libelle} ${selectedClient.prenom} ${selectedClient.nom}`;

    onClientSelect({
      clientName,
      email: selectedClient.email,
      phone: selectedPhone,
      address: selectedAddress,
      ouvrageId: selectedOuvrage || undefined,
      extrabatClientId: selectedClient.id
    });

    // Reset state
    setSearchQuery('');
    setClients([]);
    setSelectedClient(null);
    setShowDetails(false);
    setSelectedPhone('');
    setSelectedAddress('');
    setSelectedOuvrage(null);
  };

  const handleCancel = () => {
    setSelectedClient(null);
    setShowDetails(false);
    setSelectedPhone('');
    setSelectedAddress('');
    setSelectedOuvrage(null);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Rechercher un client Extrabat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-[#29235C] transition-colors"
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#29235C] border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {clients.length > 0 && !showDetails && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm max-h-60 overflow-y-auto touch-pan-y overscroll-contain">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => handleClientSelect(client)}
              className="w-full p-4 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors touch-manipulation"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {client.civilite.libelle} {client.prenom} {client.nom}
                  </div>
                  <div className="text-sm text-gray-600">{client.email}</div>
                  {client.telephones && Array.isArray(client.telephones) && client.telephones.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      📞 {client.telephones[0].number}
                    </div>
                  )}
                  {client.adresses && Array.isArray(client.adresses) && client.adresses.length > 0 && (
                    <div className="text-xs text-gray-500">
                      📍 {client.adresses[0].codePostal} {client.adresses[0].ville}
                    </div>
                  )}
                  {client.ouvrage && client.ouvrage.length > 0 && (
                    <div className="text-xs text-[#29235C] mt-1">
                      {client.ouvrage.length} ouvrage{client.ouvrage.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <User className="h-5 w-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Client Details Selection */}
      {showDetails && selectedClient && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#29235C]">
              Sélection des informations client
            </h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 hover:bg-blue-100 rounded"
            >
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          <div className="bg-white p-4 rounded-lg">
            <div className="font-medium text-gray-900 mb-2">
              {selectedClient.civilite.libelle} {selectedClient.prenom} {selectedClient.nom}
            </div>
            <div className="text-sm text-gray-600">{selectedClient.email}</div>
          </div>

          {/* Phone Selection */}
          {selectedClient.telephones && selectedClient.telephones.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="h-4 w-4 inline mr-1" />
                Téléphone
              </label>
              <select
                value={selectedPhone}
                onChange={(e) => setSelectedPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-[#29235C]"
              >
                <option value="">Aucun téléphone</option>
                {selectedClient.telephones.map((tel, index) => (
                  <option key={index} value={tel.number}>
                    {tel.number} ({tel.type?.libelle || 'Type inconnu'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Address Selection */}
          {selectedClient.adresses && selectedClient.adresses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Adresse
              </label>
              <select
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-[#29235C]"
              >
                <option value="">Aucune adresse</option>
                {selectedClient.adresses.map((addr, index) => (
                  <option key={index} value={`${addr.description}, ${addr.codePostal} ${addr.ville}`}>
                    {addr.description}, {addr.codePostal} {addr.ville} ({addr.type?.libelle || 'Type inconnu'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ouvrage Selection */}
          {selectedClient.ouvrage && selectedClient.ouvrage.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building className="h-4 w-4 inline mr-1" />
                Ouvrage
              </label>
              <select
                value={selectedOuvrage || ''}
                onChange={(e) => setSelectedOuvrage(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-[#29235C]"
              >
                <option value="">Aucun ouvrage</option>
                {selectedClient.ouvrage.map((ouvrage) => (
                  <option key={ouvrage.id} value={ouvrage.id}>
                    {ouvrage.article.libelle} - {ouvrage.libelle || 'Sans nom'}
                    {ouvrage.status && ` (${ouvrage.status.label})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-blue-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirmSelection}
              className="px-6 py-2 bg-[#29235C] hover:bg-[#1f1a4d] text-white rounded-lg font-medium"
            >
              Utiliser ces informations
            </button>
          </div>
        </div>
      )}
    </div>
  );
};