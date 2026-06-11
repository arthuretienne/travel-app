// frontend/src/hooks/usePushNotifications.js
// Hook for Web Push notification subscription management

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { getToken } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch {
      // Ignore errors
    }
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) return { success: false };

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        return { success: false, message: 'Autorisez les notifications dans votre navigateur pour activer les alertes.' };
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID public key
      const vapidRes = await fetch(`${API_URL}/api/push/vapid-key`);
      if (!vapidRes.ok) return { success: false, message: 'Les notifications push sont indisponibles pour le moment.' };
      const { publicKey } = await vapidRes.json();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to backend
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) {
        // Backend refused (e.g. plan without push) — roll back the browser subscription
        const data = await res.json().catch(() => ({}));
        await subscription.unsubscribe().catch(() => {});
        return {
          success: false,
          message: data.message || 'Activation impossible pour le moment.',
          upgradeUrl: data.upgradeUrl,
        };
      }

      setIsSubscribed(true);
      return { success: true };
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
      return { success: false, message: 'Activation impossible pour le moment.' };
    }
  }, [isSupported, getToken]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) return;

      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      const token = await getToken();
      await fetch(`${API_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint }),
      });

      setIsSubscribed(false);
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
    }
  }, [getToken]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
  };
}
