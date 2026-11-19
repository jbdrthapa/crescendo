import app from "ags/gtk4/app";
import Gdk from "gi://Gdk?version=4.0";
import { Astal, Gtk } from "ags/gtk4";
import AstalNotifd from "gi://AstalNotifd";
import Notification from "./Notification";
import { For, createState, onCleanup } from "ags";

const MAX_VISIBLE_NOTIFICATIONS = 20;

export default function NotificationPopups(monitor: Gdk.Monitor) {
  const notifd = AstalNotifd.get_default();

  const [notifications, setNotifications] = createState(
    new Array<AstalNotifd.Notification>(),
  );

  const notifiedHandler = notifd.connect("notified", (_, id, replaced) => {
    const notification = notifd.get_notification(id);
    if (!notification) return;

    if (replaced && notifications.peek().some((n) => n.id === id)) {
      setNotifications((ns) =>
        ns.map((n) => (n.id === id ? notification : n)),
      );
    } else {
      setNotifications((ns) => [notification, ...ns].slice(0, MAX_VISIBLE_NOTIFICATIONS));
    }
  });

  const resolvedHandler = notifd.connect("resolved", (_, id) => {
    setNotifications((ns) => ns.filter((n) => n.id !== id));
  });

  onCleanup(() => {
    notifd.disconnect(notifiedHandler);
    notifd.disconnect(resolvedHandler);
  });

  return (
    <window
      application={app}
      class="NotificationPopups"
      visible={notifications((ns) => ns.length > 0)}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
      gdkmonitor={monitor}
      $={(self) => onCleanup(() => self.destroy())}
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        <For each={notifications}>
          {(notification) => (
            <Notification notification={notification} />
          )}
        </For>
      </box>
    </window>
  );
}
