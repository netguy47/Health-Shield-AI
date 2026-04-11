/**
 * Sovereign Sentinel Notifications
 * Handles local PWA reminders for scheduled vital checkups.
 */

/**
 * Requests permission for Notifications
 */
export const requestSovereignNotifications = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

/**
 * Schedules a local Sentinel checkup reminder
 */
export const scheduleSentinelCheck = (title: string, body: string, delayMs: number) => {
  if (Notification.permission !== 'granted') return;

  setTimeout(() => {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      silent: false,
      tag: 'sentinel-checkup'
    });
  }, delayMs);
};

/**
 * Clinical Reminders Logic
 */
export const triggerScheduledReminders = () => {
  const now = new Date();
  const hours = now.getHours();

  // Morning Ritual (8 AM)
  if (hours === 8) {
    scheduleSentinelCheck(
      "SENTINEL: Morning Update Required",
      "Commence morning hemodynamic intake to maintain physiological baseline accuracy.",
      1000
    );
  }

  // Evening Audit (8 PM)
  if (hours === 20) {
    scheduleSentinelCheck(
      "SENTINEL: Evening Vital Audit",
      "Final daily intake requested for nocturnal trajectory analysis.",
      1000
    );
  }
};
