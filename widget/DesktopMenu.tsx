import Gtk from "gi://Gtk?version=4.0";
import PopupWindow from "../widget/PopupWindow";
import { Astal } from "ags/gtk4";
import app from "ags/gtk4/app";
import { WindowName } from "../constants";
import WidgetManager from "../WidgetManager";

const windowName = WindowName.desktopMenu;

export function DesktopMenu() {
    const settings = WidgetManager.GetSettingsWindow();

    const menu = new PopupWindow({
        name: windowName,
        namespace: windowName,
        anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT,
        application: app,
        child: (
            <box orientation={Gtk.Orientation.VERTICAL}>
                <button
                    cssName="desktop-menu-button"
                    onClicked={() => {
                        settings.Apps();
                        settings.forceOpen();
                    }}
                >
                    Apps
                </button>
                <button
                    cssName="desktop-menu-button"
                    onClicked={() => {
                        settings.Wallpaper();
                        settings.forceOpen();
                    }}
                >
                    Wallpaper
                </button>
                <button
                    cssName="desktop-menu-button"
                    onClicked={() => {
                        settings.Power();
                        settings.forceOpen();
                    }}
                >
                    Power
                </button>
                <button
                    cssName="desktop-menu-button"
                    onClicked={() => {
                        settings.Settings();
                        settings.forceOpen();
                    }}
                >
                    Settings
                </button>
            </box>
        ),
    });

    const rightClickGesture = new Gtk.GestureClick();
    rightClickGesture.set_button(3);
    rightClickGesture.connect("released", () => {
        menu.hide_all();
    });
    menu.add_controller(rightClickGesture);

    return menu;
}
