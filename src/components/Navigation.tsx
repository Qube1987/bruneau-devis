import React, { useState, useEffect } from 'react';
import { FileText, LogOut, Users, Package, Image, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const { signOut, userType } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();

    const channel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);

      if (error) throw error;

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const allNavItems = [
    { id: 'devis', label: 'Nouveau devis', icon: FileText, allowExternal: true },
    { id: 'list', label: 'Mes devis', icon: FileText, allowExternal: false },
    { id: 'products', label: 'Produits', icon: Package, allowExternal: false },
    { id: 'media', label: 'Bibliothèque', icon: Image, allowExternal: false },
    { id: 'clients', label: 'Clients', icon: Users, allowExternal: false },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined, allowExternal: false },
  ];

  // Filtrer les onglets selon le type d'utilisateur
  const navItems = userType === 'external'
    ? allNavItems.filter(item => item.allowExternal)
    : allNavItems;

  return (
    <nav className="bg-[#29235C] text-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/bruneau_protection_logo_quadri_reserve.png"
              alt="Bruneau Protection"
              className="h-8 w-auto"
            />
          </div>
          
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 relative ${
                    currentView === item.id
                      ? 'bg-[#E72C63] text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-[#E72C63] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Déconnexion</span>
        </button>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden mt-4 overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`px-3 py-2 rounded-lg transition-colors flex flex-col items-center gap-1 flex-shrink-0 relative ${
                  currentView === item.id
                    ? 'bg-[#E72C63] text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs whitespace-nowrap">{item.label}</span>
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-[#E72C63] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};