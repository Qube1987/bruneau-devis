import React, { useState, useEffect, useRef } from 'react';
import { FileText, LogOut, Users, Package, Image, Bell, Menu, X, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PushSettings } from './PushSettings';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const { signOut, userType, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showPushSettings, setShowPushSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
  ];

  // Filtrer les onglets selon le type d'utilisateur
  const navItems = userType === 'external'
    ? allNavItems.filter(item => item.allowExternal)
    : allNavItems;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 flex-shrink-0">
              <img
                src="/bruneau_protection_logo_quadri.png"
                alt="Bruneau Protection"
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-[#29235C] hidden sm:block">
                DEV
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 relative text-sm font-medium ${currentView === item.id
                      ? 'bg-[#29235C]/10 text-[#29235C]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewChange('notifications')}
              className="relative p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-[#29235C]' : 'text-gray-700'}`} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-[#E72C63] text-white text-[11px] font-bold shadow-sm"
                  style={{ animation: 'badgePulse 2s ease-in-out infinite' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              <style>{`
                @keyframes badgePulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.1); }
                }
              `}</style>
            </button>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Menu utilisateur"
              >
                <User className="h-5 w-5 text-gray-700" />
                <ChevronDown className={`h-4 w-4 text-gray-700 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm text-gray-900 font-medium">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white relative z-50 overflow-hidden">
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-3 min-h-[48px] rounded-lg transition-colors flex items-center gap-3 relative ${currentView === item.id
                    ? 'bg-[#29235C]/10 text-[#29235C]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-base font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showPushSettings && <PushSettings onClose={() => setShowPushSettings(false)} />}
    </header>
  );
};