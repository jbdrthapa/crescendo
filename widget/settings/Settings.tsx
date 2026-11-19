import Gtk from "gi://Gtk?version=4.0";
import { Astal } from "ags/gtk4";
import app from "ags/gtk4/app";

import { WindowName } from "../../constants";
import PopupWindow from "../PopupWindow";
import { PowerSettings } from "./PowerSettings";
import { WallpaperSettings } from "./WallpaperSettings";
import { Preferences } from "./Preferences";
import { AboutSettings } from "./AboutSettings";
import { NotificationsSettings } from "./NotificationsSettings";
import { WeatherCalendar } from "./today/WeatherCalendar";
import { AppListing } from "./apps/AppListing";
import { Players } from "./players/players";

export type SettingsWindow = InstanceType<typeof PopupWindow> & {
    toggle: () => void;
    hide: () => void;
    hide_all: () => void;
    Settings: () => void;
    Today: () => void;
    Apps: () => void;
    Wallpaper: () => void;
    Players: () => void;
    Power: () => void;
    Notifications: () => void;
    Preferences: () => void;
    About: () => void;
};

export function Settings(): SettingsWindow {
    const windowName = WindowName.settings;

    const { widget: weatherCalendar, reset: resetCalendar } = WeatherCalendar();
    const appListing = AppListing() as Gtk.Widget;
    const players = Players() as Gtk.Widget;
    const powerSettings = PowerSettings() as Gtk.Widget;
    const wallpaperSettings = WallpaperSettings() as Gtk.Widget;
    const notificationsSettings = NotificationsSettings() as Gtk.Widget;
    const preferences = Preferences() as Gtk.Widget;
    const aboutSettings = AboutSettings() as Gtk.Widget;

    const notebook = new Gtk.Notebook({
        tabPos: Gtk.PositionType.TOP,
        cssName: "settings-notebook",
        hexpand: true,
        vexpand: true,
    });

    notebook.append_page(weatherCalendar, new Gtk.Label({ label: "Today" }));
    notebook.append_page(appListing, new Gtk.Label({ label: "Apps" }));
    notebook.append_page(wallpaperSettings, new Gtk.Label({ label: "Wallpaper" }));
    notebook.append_page(players, new Gtk.Label({ label: "Players" }));
    notebook.append_page(powerSettings, new Gtk.Label({ label: "Power" }));
    notebook.append_page(notificationsSettings, new Gtk.Label({ label: "Notifications" }));
    notebook.append_page(preferences, new Gtk.Label({ label: "Preferences" }));
    notebook.append_page(aboutSettings, new Gtk.Label({ label: "About" }));

    const settingsPopup = new PopupWindow({
        name: windowName,
        namespace: windowName,
        anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT,
        exclusivity: Astal.Exclusivity.EXCLUSIVE,
        application: app,
        child: (
            <box cssName="settings-container">
                {notebook}
            </box>
        ),
    }) as unknown as SettingsWindow;

    settingsPopup.Settings = () => {
        notebook.set_current_page(0);
        resetCalendar();
    };

    settingsPopup.Today = () => {
        notebook.set_current_page(0);
        resetCalendar();
    };

    settingsPopup.Apps = () => {
        notebook.set_current_page(1);
        resetCalendar();
    };

    settingsPopup.Wallpaper = () => {
        notebook.set_current_page(2);
    };

    settingsPopup.Players = () => {
        notebook.set_current_page(3);
    };

    settingsPopup.Power = () => {
        notebook.set_current_page(4);
    };

    settingsPopup.Notifications = () => {
        notebook.set_current_page(5);
    };

    settingsPopup.Preferences = () => {
        notebook.set_current_page(6);
    };

    settingsPopup.About = () => {
        notebook.set_current_page(7);
    };

    return settingsPopup;
}
