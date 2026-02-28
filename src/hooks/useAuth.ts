import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'internal' | 'external'>('external');

  useEffect(() => {
    let mounted = true;

    const getUserType = async (userId: string, userEmail?: string): Promise<'internal' | 'external'> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const { data, error } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', userId)
          .abortSignal(controller.signal)
          .maybeSingle();

        clearTimeout(timeoutId);

        if (error) {
          console.error('Error fetching user type:', error);
          return 'external';
        }

        if (!data) {
          console.log('No profile found for user, creating one...');
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: userEmail,
              user_type: 'external'
            });

          if (insertError) {
            console.error('Error creating profile:', insertError);
          }

          return 'external';
        }

        return (data.user_type as 'internal' | 'external') || 'external';
      } catch (error) {
        console.error('Error fetching user type:', error);
        return 'external';
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          const type = await getUserType(session.user.id, session.user.email);
          if (mounted) {
            setUserType(type);
          }
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in initAuth:', error);
        if (mounted) {
          setUser(null);
          setUserType('external');
          setLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.error('Auth initialization timeout - forcing completion');
        setLoading(false);
      }
    }, 20000);

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        (async () => {
          if (!mounted) return;

          setUser(session?.user ?? null);

          if (session?.user) {
            try {
              const type = await getUserType(session.user.id, session.user.email);
              if (mounted) {
                setUserType(type);
              }
            } catch (error) {
              console.error('Error in onAuthStateChange:', error);
              if (mounted) {
                setUserType('external');
              }
            }
          } else {
            if (mounted) {
              setUserType('external');
            }
          }
        })();
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, userType: 'internal' | 'external' = 'external') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: userType
        }
      }
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    userType,
    loading,
    signIn,
    signUp,
    signOut,
  };
};