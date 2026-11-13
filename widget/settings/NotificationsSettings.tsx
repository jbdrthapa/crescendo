import Gtk from "gi://Gtk?version=4.0";
import AstalNotifd from "gi://AstalNotifd";
import { onCleanup } from "ags";

function sortNotifications(notifications: AstalNotifd.Notification[]) {
  return [...notifications].sort(
    (a, b) => Number(b.time ?? 0) - Number(a.time ?? 0),
  );
}

function formatNotificationTime(timestamp: bigint | number) {
  const seconds = Number(timestamp);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(seconds * 1000));
}

function createNotificationRow(notification: AstalNotifd.Notification) {
  const row = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 4,
    marginTop: 4,
    marginBottom: 4,
  });
  row.add_css_class("settings-param-value");

  const header = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: 8,
    valign: Gtk.Align.CENTER,
  });

  const appLabel = new Gtk.Label({
    label: notification.app_name || notification.appName || "Notification",
    halign: Gtk.Align.START,
    cssName: "settings-param-heading",
    hexpand: true,
  });

  const timeLabel = new Gtk.Label({
    label: formatNotificationTime(notification.time),
    halign: Gtk.Align.END,
    cssName: "settings-param-caption",
  });

  const summaryLabel = new Gtk.Label({
    label: notification.summary || "Notification",
    halign: Gtk.Align.START,
    wrap: true,
    cssName: "settings-param-value",
    xalign: 0,
  });

  header.append(appLabel);
  header.append(timeLabel);
  row.append(header);
  row.append(summaryLabel);

  if (notification.body?.trim()) {
    const bodyLabel = new Gtk.Label({
      label: notification.body.trim(),
      halign: Gtk.Align.START,
      wrap: true,
      cssName: "settings-param-caption",
      xalign: 0,
    });
    row.append(bodyLabel);
  }

  return row;
}

export function NotificationsSettings() {
  const notifd = AstalNotifd.get_default();
  let persistentNotifications = sortNotifications(notifd.get_notifications());

  const container = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 12,
    marginTop: 18,
    marginBottom: 18,
    marginStart: 18,
    marginEnd: 18,
    hexpand: true,
    vexpand: true,
  });

  const header = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    halign: Gtk.Align.FILL,
    valign: Gtk.Align.CENTER,
  });

  const title = new Gtk.Label({
    label: "Notifications",
    halign: Gtk.Align.START,
    cssName: "section-heading",
    hexpand: true,
  });

  const clearButton = new Gtk.Button({
    label: "Clear all",
    cssName: "settings-button",
  });

  header.append(title);
  header.append(clearButton);
  container.append(header);

  const scrolled = new Gtk.ScrolledWindow({
    vexpand: true,
    hexpand: true,
  });

  const listBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 8,
    vexpand: true,
  });

  const renderNotifications = () => {
    let child = listBox.get_first_child();
    while (child) {
      const current = child;
      child = child.get_next_sibling();
      listBox.remove(current);
    }

    const items = sortNotifications(persistentNotifications);
    clearButton.sensitive = items.length > 0;

    if (items.length === 0) {
      const emptyState = new Gtk.Label({
        label: "No notifications yet",
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
        marginTop: 20,
        cssName: "settings-param-caption",
      });
      listBox.append(emptyState);
      scrolled.set_child(listBox);
      return;
    }

    items.forEach((notification) => {
      listBox.append(createNotificationRow(notification));
    });

    scrolled.set_child(listBox);
  };

  clearButton.connect("clicked", () => {
    persistentNotifications.forEach((notification) => notification.dismiss());
    persistentNotifications = [];
    renderNotifications();
  });

  const notifiedHandler = notifd.connect("notified", (_, id) => {
    const notification = notifd.get_notification(id);
    if (!notification) return;

    const exists = persistentNotifications.some((item) => item.id === id);
    persistentNotifications = exists
      ? persistentNotifications.map((item) => (item.id === id ? notification : item))
      : [notification, ...persistentNotifications];

    renderNotifications();
  });

  const resolvedHandler = notifd.connect("resolved", () => {
    // Keep the settings history persistent until the user clicks Clear all.
  });

  onCleanup(() => {
    notifd.disconnect(notifiedHandler);
    notifd.disconnect(resolvedHandler);
  });

  renderNotifications();
  container.append(scrolled);

  return container;
}
