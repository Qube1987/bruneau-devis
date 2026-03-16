import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Clé VAPID publique en dur — DOIT correspondre à la clé privée configurée sur Supabase Edge Functions
const VAPID_PUBLIC_KEY = 'BH2A-EIhJE7x_DcWaYZoIc_HemxXXnPSc1r0wFjNwvkjUFpzT5IXrPHvT_ck2zkoIi8YwrUdIYRJ0rjmwUg-8ws';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const usePushNotifications = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        setIsSupported(supported);

        if (supported) {
            setPermissionState(Notification.permission);
            checkSubscription();
        }
    }, []);

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (err) {
            console.error('[Push] Error checking subscription:', err);
        }
    };

    const subscribe = useCallback(async () => {
        if (!isSupported) {
            setError('Notifications push non supportées');
            return false;
        }

        try {
            setLoading(true);
            setError(null);

            // 1. Demander la permission AVANT toute autre chose
            const permission = await Notification.requestPermission();
            setPermissionState(permission);

            if (permission !== 'granted') {
                setError('Permission de notification refusée');
                return false;
            }

            const registration = await navigator.serviceWorker.ready;

            // 2. Supprimer l'ancienne subscription (dans le navigateur ET Supabase)
            //    pour éviter les problèmes de VAPID mismatch
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
                console.log('[Push] Removing old subscription to avoid VAPID mismatch...');
                // Supprimer de Supabase
                try {
                    await supabase
                        .from('devis_push_subscriptions')
                        .delete()
                        .eq('endpoint', existingSubscription.endpoint);
                } catch (dbErr) {
                    console.warn('[Push] Could not remove old subscription from DB:', dbErr);
                }
                // Supprimer du navigateur
                await existingSubscription.unsubscribe();
                console.log('[Push] Old subscription removed');
            }

            // 3. Créer une nouvelle subscription avec la bonne clé VAPID
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            const subscriptionJSON = subscription.toJSON();

            // 4. Récupérer l'utilisateur connecté
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('Utilisateur non connecté');
                return false;
            }

            // 5. Sauvegarder dans la table devis_push_subscriptions
            const { error: upsertError } = await supabase
                .from('devis_push_subscriptions')
                .upsert(
                    {
                        user_id: user.id,
                        user_email: user.email,
                        endpoint: subscriptionJSON.endpoint,
                        p256dh: subscriptionJSON.keys?.p256dh,
                        auth: subscriptionJSON.keys?.auth,
                        user_agent: navigator.userAgent,
                        last_used: new Date().toISOString(),
                    },
                    {
                        onConflict: 'endpoint',
                    }
                );

            if (upsertError) {
                console.error('[Push] Error saving subscription:', upsertError);
                setError('Erreur lors de l\'enregistrement de l\'abonnement');
                return false;
            }

            setIsSubscribed(true);
            console.log('[Push] Successfully subscribed with correct VAPID key');
            return true;
        } catch (err) {
            console.error('[Push] Error subscribing:', err);
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
            return false;
        } finally {
            setLoading(false);
        }
    }, [isSupported]);

    const unsubscribe = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Remove from Supabase
                await supabase
                    .from('devis_push_subscriptions')
                    .delete()
                    .eq('endpoint', subscription.endpoint);

                // Unsubscribe from browser
                await subscription.unsubscribe();
            }

            setIsSubscribed(false);
            console.log('[Push] Successfully unsubscribed');
            return true;
        } catch (err) {
            console.error('[Push] Error unsubscribing:', err);
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        isSubscribed,
        isSupported,
        permissionState,
        loading,
        error,
        subscribe,
        unsubscribe,
    };
};
