import { useState, useCallback, useEffect } from "react";

type PermissionState = NotificationPermission | "unsupported";

export function usePushNotifications() {
  const supported = typeof window !== "undefined" && "Notification" in window;

  const [permission, setPermission] = useState<PermissionState>(
    supported ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    if (supported) setPermission(Notification.permission);
  }, [supported]);

  const requestPermission = useCallback(async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [supported]);

  const notify = useCallback(
    (title: string, body?: string, onClick?: () => void) => {
      if (!supported || Notification.permission !== "granted") return;
      const n = new Notification(title, {
        body: body ?? undefined,
        icon: "/favicon.png",
      });
      if (onClick) n.onclick = () => { onClick(); n.close(); };
    },
    [supported]
  );

  return { permission, requestPermission, notify, supported };
}
