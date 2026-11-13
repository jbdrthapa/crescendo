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

export function Settings() {
    const windowName = WindowName.settings;

    const { widget: weatherCalendar, reset: resetCalendar } = WeatherCalendar();
    const appListing = AppListing() as any;
    const players = Players() as any;
    const powerSettings = PowerSettings() as any;
    const wallpaperSettings = WallpaperSettings() as any;
    const notificationsSettings = NotificationsSettings() as any;
    const preferences = Preferences() as any;
    const aboutSettings = AboutSettings() as any;

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

    const SettingsPopup = new PopupWindow({
        name: windowName,
        namespace: windowName,
        anchor: Astal.WindowAnchor.TOP,
        exclusivity: Astal.Exclusivity.IGNORE,
        application: app,
        child: (
            <box cssName="settings-container">
                {notebook}
            </box>
        ),
    });

    const customPopup = SettingsPopup as any;

    customPopup.Settings = () => {
        notebook.set_current_page(0);
        resetCalendar();
    };

    customPopup.Today = () => {
        notebook.set_current_page(0);
        resetCalendar();
    };

    customPopup.Apps = () => {
        notebook.set_current_page(1);
        resetCalendar();
    };

    customPopup.Wallpaper = () => {
        notebook.set_current_page(2);
    };

    customPopup.Players = () => {
        notebook.set_current_page(3);
    };

    customPopup.Power = () => {
        notebook.set_current_page(4);
    };

    customPopup.Notifications = () => {
        notebook.set_current_page(5);
    };

    customPopup.Preferences = () => {
        notebook.set_current_page(6);
    };

    customPopup.About = () => {
        notebook.set_current_page(7);
    };

    return SettingsPopup;
}
