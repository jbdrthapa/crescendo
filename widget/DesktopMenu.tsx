import Gtk from "gi://Gtk?version=4.0";
import PopupWindow from "../widget/PopupWindow";
import { Astal } from "ags/gtk4";
import app from "ags/gtk4/app";
import { WindowName } from "../constants";
import WidgetManager from "../WidgetManager";

const windowName = WindowName.desktopMenu;

function showSettings(action: (() => void) | undefined, settings = WidgetManager.GetSettingsWindow()) {
    action?.();
    settings.toggle();
}

export function DesktopMenu() {
    const settings = WidgetManager.GetSettingsWindow();

    return new PopupWindow({
        name: windowName,
        namespace: windowName,
        anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT,
        application: app,
        child: (
            <box orientation={Gtk.Orientation.VERTICAL}>
                <button
                    cssName="desktop-menu-button"
                    onClicked={() => showSettings(settings.Apps, settings)}
                >
                    Apps
                </button>
                <button
                    cssName="desktop-menu-button"
                    onClicked={() => showSettings(settings.Wallpaper, settings)}
                >
                    Wallpaper
                </button>
                <button
                    cssName="desktop-menu-button"
                    onClicked={() => showSettings(settings.Power, settings)}
                >
                    Power
                </button>
                <button
                    cssName="desktop-menu-button"
                    onClicked={() => showSettings(settings.Settings, settings)}
                >
                    Settings
                </button>
            </box>
        ),
    });
}
