import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Mail, Phone, MapPin, FileText, Edit, Trash2, X, Building2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  company: string | null;
  siret: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface DevisWithClient {
  id: string;
  titre_affaire: string;
  status: 'draft' | 'sent' | 'signed';
  created_at: string;
  totaux: {
    total_ttc: number;
  };
}

export const ClientManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientDevis, setClientDevis] = useState<DevisWithClient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    company: '',
    siret: '',
    notes: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadClientDevis(selectedClient.id);
    }
  }, [selectedClient]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientDevis = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('devis')
        .select('id, titre_affaire, status, created_at, totaux')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientDevis(data || []);
    } catch (error) {
      console.error('Error loading client devis:', error);
    }
  };

  const importClientsFromDevis = async () => {
    if (!confirm('Voulez-vous importer les clients depuis vos devis existants ?')) return;

    try {
      setImporting(true);

      const { data: allDevis, error: devisError } = await supabase
        .from('devis')
        .select('id, client, client_id');

      if (devisError) throw devisError;

      const clientsMap = new Map<string, any>();
      const devisToUpdate: Array<{ devisId: string; clientId: string }> = [];

      for (const devis of allDevis || []) {
        if (!devis.client) continue;

        const clientData = devis.client;
        const key = clientData.email?.toLowerCase() || `${clientData.nom}_${clientData.prenom}`.toLowerCase();

        if (!clientsMap.has(key)) {
          const newClient = {
            name: `${clientData.prenom || ''} ${clientData.nom || ''}`.trim() || 'Client sans nom',
            email: clientData.email || null,
            phone: clientData.telephone || null,
            address: clientData.adresse || null,
            city: clientData.ville || null,
            postal_code: clientData.code_postal || null,
            company: clientData.societe || null,
            siret: null,
            notes: null
          };

          const { data: existingClient, error: checkError } = await supabase
            .from('clients')
            .select('id')
            .or(`email.eq.${newClient.email},name.eq.${newClient.name}`)
            .maybeSingle();

          if (checkError && checkError.code !== 'PGRST116') throw checkError;

          let clientId: string;

          if (existingClient) {
            clientId = existingClient.id;
          } else {
            const { data: insertedClient, error: insertError } = await supabase
              .from('clients')
              .insert([newClient])
              .select('id')
              .single();

            if (insertError) throw insertError;
            clientId = insertedClient.id;
          }

          clientsMap.set(key, clientId);
        }

        const clientId = clientsMap.get(key);
        if (clientId && !devis.client_id) {
          devisToUpdate.push({ devisId: devis.id, clientId });
        }
      }

      for (const { devisId, clientId } of devisToUpdate) {
        const { error: updateError } = await supabase
          .from('devis')
          .update({ client_id: clientId })
          .eq('id', devisId);

        if (updateError) {
          console.error(`Error updating devis ${devisId}:`, updateError);
        }
      }

      await loadClients();
      alert(`${clientsMap.size} clients ont été importés avec succès !`);
    } catch (error) {
      console.error('Error importing clients:', error);
      alert('Erreur lors de l\'importation des clients');
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedClient) {
        const { error } = await supabase
          .from('clients')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', selectedClient.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([formData]);

        if (error) throw error;
      }

      await loadClients();
      resetForm();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Erreur lors de l\'enregistrement du client');
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      await loadClients();
      if (selectedClient?.id === clientId) {
        setSelectedClient(null);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Erreur lors de la suppression du client');
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      postal_code: client.postal_code || '',
      company: client.company || '',
      siret: client.siret || '',
      notes: client.notes || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      company: '',
      siret: '',
      notes: ''
    });
    setSelectedClient(null);
    setShowForm(false);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      signed: 'bg-green-100 text-green-700'
    };
    const labels = {
      draft: 'Brouillon',
      sent: 'Envoyé',
      signed: 'Signé'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-[#29235C] flex items-center gap-2">
            <Users className="w-8 h-8" />
            Gestion des clients
          </h1>
          <div className="flex gap-2">
            {clients.length === 0 && (
              <button
                onClick={importClientsFromDevis}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                {importing ? 'Import en cours...' : 'Importer depuis les devis'}
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#E72C63] text-white rounded-lg hover:bg-[#d01f54] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nouveau client
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E72C63]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Liste des clients ({filteredClients.length})</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedClient?.id === client.id ? 'bg-blue-50' : ''
                  }`}
                onClick={() => setSelectedClient(client)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                    {client.company && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3" />
                        {client.company}
                      </p>
                    )}
                    <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                      {client.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </div>
                      )}
                      {client.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {client.city}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(client);
                      }}
                      className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(client.id);
                      }}
                      className="p-3 text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredClients.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Aucun client trouvé
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">
              {selectedClient ? `Devis de ${selectedClient.name}` : 'Détails du client'}
            </h2>
          </div>
          <div className="p-4">
            {selectedClient ? (
              <div>
                <div className="mb-6 space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{selectedClient.name}</h3>
                    {selectedClient.company && (
                      <p className="text-gray-600 flex items-center gap-1 mt-1">
                        <Building2 className="w-4 h-4" />
                        {selectedClient.company}
                      </p>
                    )}
                  </div>
                  {selectedClient.siret && (
                    <p className="text-sm text-gray-600">SIRET: {selectedClient.siret}</p>
                  )}
                  {selectedClient.email && (
                    <p className="text-gray-600 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {selectedClient.email}
                    </p>
                  )}
                  {selectedClient.phone && (
                    <p className="text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedClient.phone}
                    </p>
                  )}
                  {selectedClient.address && (
                    <p className="text-gray-600 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {selectedClient.address}
                      {selectedClient.postal_code && `, ${selectedClient.postal_code}`}
                      {selectedClient.city && ` ${selectedClient.city}`}
                    </p>
                  )}
                  {selectedClient.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">{selectedClient.notes}</p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Devis ({clientDevis.length})
                  </h4>
                  {clientDevis.length > 0 ? (
                    <div className="space-y-2">
                      {clientDevis.map((devis) => (
                        <div
                          key={devis.id}
                          className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{devis.titre_affaire}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(devis.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(devis.status)}
                              <p className="text-sm font-semibold mt-1">
                                {devis.totaux?.total_ttc?.toFixed(2)} €
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Aucun devis pour ce client</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Sélectionnez un client pour voir les détails
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#29235C]">
                  {selectedClient ? 'Modifier le client' : 'Nouveau client'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-3 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E72C63]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Société
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E72C63]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E72C63]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E72C63]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E72C63]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code postal
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E72C63]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E72C63]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SIRET
                    </label>
                    <input
                      type="text"
                      value={formData.siret}
                      onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E72C63]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E72C63]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#E72C63] text-white rounded-lg hover:bg-[#d01f54] transition-colors"
                  >
                    {selectedClient ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
