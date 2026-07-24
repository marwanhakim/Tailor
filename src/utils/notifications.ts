import { initDB } from '../db';
import { Order } from '../types';

export interface UpcomingDelivery {
  order: Order;
  daysRemaining: number; // 0 = today, negative = overdue, positive = days left
  isToday: boolean;
  isOverdue: boolean;
}

/**
 * Checks if browser push notifications are supported
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Gets current notification permission status ('granted', 'denied', or 'default')
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

/**
 * Requests browser notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
};

/**
 * Sends a native browser push notification
 */
export const sendBrowserNotification = (title: string, options?: NotificationOptions) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notification = new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      dir: 'rtl',
      lang: 'ar',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      window.dispatchEvent(new CustomEvent('openDailyTasksModal'));
      notification.close();
    };
  } catch (err) {
    console.error('Failed to dispatch notification:', err);
  }
};

/**
 * Fetches all orders from IndexedDB and calculates upcoming and overdue deliveries
 */
export const getUpcomingDeliveries = async (): Promise<{
  overdue: UpcomingDelivery[];
  today: UpcomingDelivery[];
  tomorrow: UpcomingDelivery[];
  thisWeek: UpcomingDelivery[];
  totalUrgentCount: number;
}> => {
  try {
    const db = await initDB();
    const orders: Order[] = await db.getAll('orders');

    // Filter only active orders (not completed, not delivered, not cancelled)
    const activeOrders = orders.filter(
      (o) => o.status !== 'completed' && o.status !== 'delivered' && o.status !== 'cancelled' && o.deliveryDate
    );

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
    const tomorrowEnd = todayEnd + 24 * 60 * 60 * 1000;
    const weekEnd = todayStart + 7 * 24 * 60 * 60 * 1000;

    const overdue: UpcomingDelivery[] = [];
    const today: UpcomingDelivery[] = [];
    const tomorrow: UpcomingDelivery[] = [];
    const thisWeek: UpcomingDelivery[] = [];

    activeOrders.forEach((order) => {
      if (!order.deliveryDate) return;

      const delTime = new Date(order.deliveryDate).getTime();
      const delDayStart = new Date(
        new Date(order.deliveryDate).getFullYear(),
        new Date(order.deliveryDate).getMonth(),
        new Date(order.deliveryDate).getDate()
      ).getTime();

      const diffDays = Math.round((delDayStart - todayStart) / (24 * 60 * 60 * 1000));

      const item: UpcomingDelivery = {
        order,
        daysRemaining: diffDays,
        isToday: diffDays === 0,
        isOverdue: diffDays < 0,
      };

      if (diffDays < 0) {
        overdue.push(item);
      } else if (diffDays === 0) {
        today.push(item);
      } else if (diffDays === 1) {
        tomorrow.push(item);
      } else if (diffDays > 1 && delTime <= weekEnd) {
        thisWeek.push(item);
      }
    });

    // Sort overdue by most overdue first
    overdue.sort((a, b) => a.daysRemaining - b.daysRemaining);
    // Sort others by closest delivery date first
    today.sort((a, b) => (a.order.deliveryDate || 0) - (b.order.deliveryDate || 0));
    tomorrow.sort((a, b) => (a.order.deliveryDate || 0) - (b.order.deliveryDate || 0));
    thisWeek.sort((a, b) => (a.order.deliveryDate || 0) - (b.order.deliveryDate || 0));

    const totalUrgentCount = overdue.length + today.length;

    return { overdue, today, tomorrow, thisWeek, totalUrgentCount };
  } catch (err) {
    console.error('Error getting upcoming deliveries:', err);
    return { overdue: [], today: [], tomorrow: [], thisWeek: [], totalUrgentCount: 0 };
  }
};

/**
 * Checks deliveries and triggers browser push notification if needed
 */
export const checkAndNotifyDeliveries = async () => {
  if (getNotificationPermission() !== 'granted') return;

  const { overdue, today } = await getUpcomingDeliveries();
  const total = overdue.length + today.length;

  if (total === 0) return;

  // Prevent sending duplicate notifications too frequently in same session
  const lastNotify = localStorage.getItem('lastDeliveryNotifyDate');
  const todayStr = new Date().toISOString().split('T')[0];

  if (lastNotify === todayStr) return;

  let bodyText = '';
  if (today.length > 0 && overdue.length > 0) {
    bodyText = `لديك ${today.length} طلبات مستحقة اليوم، و ${overdue.length} طلبات متأخرة تسليمها. اضغط للاستعراض.`;
  } else if (today.length > 0) {
    bodyText = `لديك ${today.length} طلبات خياطة موعد تسليمها اليوم. اضغط لاستعراض القائمة.`;
  } else if (overdue.length > 0) {
    bodyText = `تنبيه: لديك ${overdue.length} طلبات خياطة تجاوزت موعد التسليم. اضغط للمتابعة.`;
  }

  sendBrowserNotification('🧵 تنبيه مواعيد تسليم الخياطة', {
    body: bodyText,
    tag: 'daily-tailor-deliveries',
  });

  localStorage.setItem('lastDeliveryNotifyDate', todayStr);
};
