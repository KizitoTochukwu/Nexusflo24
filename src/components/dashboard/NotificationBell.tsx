import { Bell, CheckCheck, User, Mail, BellRing, BellOff, X, Trash2 } from "lucide-react";
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
  useDeleteNotification,
  useDeleteAllNotifications,
  Notification,
} from "@/hooks/useNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, typeof Bell> = {
  new_lead: User,
  email: Mail,
};

function NotificationItem({
  n,
  onOpen,
  onDelete,
}: {
  n: Notification;
  onOpen: (n: Notification) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = typeIcons[n.type] || Bell;
  return (
    <div
      className={`group relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted ${
        !n.read ? "bg-accent/10" : ""
      }`}
    >
      <button
        onClick={() => onOpen(n)}
        className="flex flex-1 items-start gap-3 text-left"
      >
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            !n.read ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <p
            className={`text-sm leading-tight ${
              !n.read ? "font-semibold text-foreground" : "text-foreground"
            }`}
          >
            {n.title}
          </p>
          {n.body && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.body}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
          </p>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(n.id);
        }}
        aria-label="Delete notification"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-destructive group-hover:opacity-100 focus:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const { data: unread = 0 } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const deleteOne = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();
  const { permission, requestPermission, supported } = usePushNotifications();

  const handleOpen = (n: Notification) => {
    // Mark as read first, then remove the item shortly after so the user
    // perceives the click as acknowledgement and the list stays clean.
    if (!n.read) markRead.mutate(n.id);
    setTimeout(() => deleteOne.mutate(n.id), 250);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          <div className="flex items-center gap-1">
            {supported && permission === "default" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto gap-1 px-2 py-1 text-xs text-muted-foreground"
                onClick={() => requestPermission()}
              >
                <BellRing className="h-3 w-3" /> Enable push
              </Button>
            )}
            {supported && permission === "denied" && (
              <span className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
                <BellOff className="h-3 w-3" /> Push blocked
              </span>
            )}
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto gap-1 px-2 py-1 text-xs text-muted-foreground"
                onClick={() => markAll.mutate()}
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => deleteAll.mutate()}
              >
                <Trash2 className="h-3 w-3" /> Clear all
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y p-1">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onOpen={handleOpen}
                  onDelete={(id) => deleteOne.mutate(id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
