import { useState, useEffect } from 'react';
import { Bell, Check, X, Calendar, Euro, BellRing } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { PushSettings } from './PushSettings';

interface Notification {
  id: string;
  type: string;
  devis_id: string;
  title: string;
  message: string;
  metadata: {
    client?: {
      prenom?: string;
      nom?: string;
      email?: string;
      telephone?: string;
    };
    titre_affaire?: string;
    montant_ttc?: number;
    acompte?: number;
    accepted_at?: string;
  };
  read: boolean;
  created_at: string;
}

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [filter]);

  const loadNotifications = async () => {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'unread') {
        query = query.eq('read', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const [showPushSettings, setShowPushSettings] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement des notifications...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto overflow-x-hidden">
      {showPushSettings && <PushSettings onClose={() => setShowPushSettings(false)} />}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Titre + badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-[#29235C]" />
                <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-[#E72C63] text-white text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              {/* Push settings button - visible in title row on mobile */}
              <button
                onClick={() => setShowPushSettings(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm bg-[#29235C]/10 text-[#29235C] hover:bg-[#29235C]/20 flex-shrink-0 sm:hidden"
                title="Paramètres des notifications push"
              >
                <BellRing className="w-4 h-4" />
              </button>
            </div>
            {/* Filtres + actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-sm ${filter === 'all'
                    ? 'bg-[#29235C] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-sm ${filter === 'unread'
                    ? 'bg-[#29235C] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Non lues
                </button>
                {/* Push settings button - visible inline on desktop */}
                <button
                  onClick={() => setShowPushSettings(true)}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors text-sm bg-[#29235C]/10 text-[#29235C] hover:bg-[#29235C]/20 flex-shrink-0"
                  title="Paramètres des notifications push"
                >
                  <BellRing className="w-4 h-4" />
                  Push
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Tout marquer comme lu</span>
                  <span className="sm:hidden flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Tout lu</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {notifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Aucune notification</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 sm:px-6 py-3 sm:py-4 transition-colors ${!notification.read ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-[#E72C63]' : 'bg-gray-300'
                        }`} />
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold mb-1 text-sm sm:text-base break-words ${!notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3 break-words">
                          {notification.message}
                        </p>

                        {notification.metadata && (
                          <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 space-y-2 overflow-hidden">
                            {notification.metadata.client && (
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                <span className="font-medium text-gray-700">Client:</span>
                                <span className="text-gray-600">
                                  {notification.metadata.client.prenom} {notification.metadata.client.nom}
                                </span>
                                {notification.metadata.client.telephone && (
                                  <span className="text-gray-500 break-all">
                                    • {notification.metadata.client.telephone}
                                  </span>
                                )}
                              </div>
                            )}

                            {notification.metadata.montant_ttc && (
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                <Euro className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                                <span className="font-medium text-gray-700">Montant TTC:</span>
                                <span className="text-gray-900 font-semibold">
                                  {notification.metadata.montant_ttc.toFixed(2)} €
                                </span>
                                {notification.metadata.acompte && (
                                  <span className="text-gray-600">
                                    (Acompte: {notification.metadata.acompte.toFixed(2)} €)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2 sm:mt-3 text-xs text-gray-500">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>
                            {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1.5 sm:p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Marquer comme lu"
                      >
                        <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
