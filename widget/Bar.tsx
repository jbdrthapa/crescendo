import app from "ags/gtk4/app";
import Gtk from "gi://Gtk?version=4.0";
import { Astal, Gdk } from "ags/gtk4";

import { ModulesCenter } from "./modules-center/ModulesCenter";
import { ModulesLeft } from "./modules-left/ModulesLeft";
import { WorkspaceWidget } from "./bar/WorkspaceWidget";
import { ModulesRight } from "./modules-right/ModulesRight";
import { TrayWidget } from "./bar/TrayWidget";
import { PowerProfileWidget } from "./bar/PowerProfileWidget";
import { GraphicsWidget } from "./bar/GraphicsWidget";
import { BatteryWidget } from "./bar/BatteryWidget";
import { DesktopMenu } from "./DesktopMenu";
import { WindowName } from "../constants";
import Dock from "./bar/Dock";
import IPCService from "../services/IPCService";
import IdleService from "../services/IdleService";
import WidgetManager from "../WidgetManager";

const windowName = WindowName.bar;

function CloseAllMenus(settings: any, modulesRight: any, desktopMenu: any) {
    settings?.hide_all();
    modulesRight.popup.hide_all();
    desktopMenu.hide_all();
}

export default function Bar(gdkmonitor: Gdk.Monitor) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor;

    // Create ALL widgets INSIDE Bar() — never at module top-level
    const modulesLeft = new ModulesLeft();
    const modulesCenter = new ModulesCenter();
    const modulesRight = new ModulesRight();
    const settings = WidgetManager.GetSettingsWindow();
    const dock = new Dock();
    const desktopMenu = DesktopMenu();
    const workspaceWidget = WorkspaceWidget();
    const trayWidget = TrayWidget();
    const powerProfileWidget = PowerProfileWidget();
    const graphicsWidget = GraphicsWidget();
    const batteryWidget = BatteryWidget();
    const ipcService = new IPCService();
    const idleService = new IdleService();

    // Invisible backdrop window for click detection
    const backdropButton = (
        <button cssName="invisible-backdrop" />
    ) as Gtk.Button;

    const backdrop = (
        <window
            name={windowName}
            namespace={windowName}
            layer={Astal.Layer.BACKGROUND}
            visible={true}
            anchor={
                Astal.WindowAnchor.TOP |
                Astal.WindowAnchor.BOTTOM |
                Astal.WindowAnchor.LEFT |
                Astal.WindowAnchor.RIGHT
            }
            application={app}
            cssName={"invisible-backdrop-window"}
        >
            {backdropButton}
        </window>
    ) as Astal.Window;

    // Main bar window
    const barWindow = (
        <window
            visible
            name={windowName}
            namespace={windowName}
            class={windowName}
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            layer={Astal.Layer.TOP}
            anchor={TOP | LEFT | RIGHT}
            application={app}
        >
            <centerbox cssName="bar" vexpand={true}>
                <box $type="start" spacing={5} vexpand={true} valign={Gtk.Align.CENTER}>
                    {modulesLeft}
                    {dock}
                </box>
                <box $type="center" vexpand={true} valign={Gtk.Align.CENTER}>
                    {modulesCenter}
                </box>
                <box $type="end" spacing={5} vexpand={true} valign={Gtk.Align.CENTER}>
                    {workspaceWidget}
                    {trayWidget}
                    {powerProfileWidget}
                    {graphicsWidget}
                    {batteryWidget}
                    {modulesRight}
                </box>
            </centerbox>
        </window>

    ) as Astal.Window;

    // Backdrop click gestures
    const backdropButtonGesture = new Gtk.GestureClick();
    backdropButtonGesture.set_button(0);

    const offset = 8;

    backdropButtonGesture.connect("pressed", (controller, _n, x, y) => {
        const button = controller.get_current_button();

        if (button === 1) {
            CloseAllMenus(settings, modulesRight, desktopMenu);
        } else if (button === 3) {
            desktopMenu.marginLeft = x + offset;
            desktopMenu.marginTop = y + offset;
            desktopMenu.toggle();
        }
    });

    backdropButton.add_controller(backdropButtonGesture);

    // Clicking the bar hides other windows
    const barGesture = new Gtk.GestureClick();
    barGesture.connect("pressed", () => {
       hide_others();
    });

    barWindow.add_controller(barGesture);

    function hide_others() {
    app.get_windows().forEach(window => {
      if (window !== barWindow && window.name !== "bar-background") {
        window.hide()
      }
    });
  }

    // Register windows with main app
    app.add_window(backdrop);
    app.add_window(modulesRight.popup);
    app.add_window(desktopMenu);
    app.add_window(settings);

    return barWindow;
}