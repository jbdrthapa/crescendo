import app from "ags/gtk4/app";
import Gtk from "gi://Gtk?version=4.0";
import { Astal, Gdk } from "ags/gtk4";
import GLib from "gi://GLib";

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
import { IdleWidget } from "./bar/IdleWidget";

const windowName = WindowName.bar;

function CloseAllMenus(settings: any, modulesRight: any, desktopMenu: any) {
    settings?.hide_all();
    modulesRight.popup.hide_all();
    desktopMenu.hide_all();
}

export default function Bar(gdkmonitor: Gdk.Monitor) {
    const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor;

    // Create ALL widgets INSIDE Bar() — never at module top-level
    const modulesLeft = ModulesLeft();
    const modulesCenter = ModulesCenter();
    const modulesRight = ModulesRight();
    const settings = WidgetManager.GetSettingsWindow();
    const dock = Dock();
    const desktopMenu = DesktopMenu();
    const workspaceWidget = WorkspaceWidget();
    const trayWidget = TrayWidget();
    const powerProfileWidget = PowerProfileWidget();
    const graphicsWidget = GraphicsWidget();
    const idleWidget = IdleWidget();
    const batteryWidget = BatteryWidget();
    const ipcService = IPCService.get_default();
    const idleService = IdleService.get_default();

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
            anchor={TOP | RIGHT | BOTTOM}
            application={app}
        >
            <box cssName="bar" orientation={Gtk.Orientation.VERTICAL} vexpand={true} hexpand={false} spacing={6}>
                <box cssName="bar-start" orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER} valign={Gtk.Align.START}>
                    {modulesRight}
                    {modulesLeft}
                    {workspaceWidget}
                    {dock}
                </box>
                <box cssName="bar-center" orientation={Gtk.Orientation.VERTICAL} vexpand={true} valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
                    {modulesCenter}
                </box>
                <box cssName="bar-end" orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER} valign={Gtk.Align.END} widthRequest={46} hexpand={false}>
                    {trayWidget}
                    {powerProfileWidget}
                    {graphicsWidget}
                    {idleWidget}
                    {batteryWidget}
                </box>
            </box>
        </window>

    ) as Astal.Window;

    // Backdrop click gestures
    const leftClickGesture = new Gtk.GestureClick();
    leftClickGesture.set_button(1);
    leftClickGesture.connect("pressed", () => {
        CloseAllMenus(settings, modulesRight, desktopMenu);
    });
    backdropButton.add_controller(leftClickGesture);

    const rightClickGesture = new Gtk.GestureClick();
    rightClickGesture.set_button(3);

    const offset = 8;

    rightClickGesture.connect("pressed", (_controller, _n, x, y) => {
        desktopMenu.marginLeft = x + offset;
        desktopMenu.marginTop = y + offset;
        desktopMenu.toggle();
    });

    backdropButton.add_controller(rightClickGesture);

    // Clicking empty areas of the bar closes open popups.
    // Deferred handling allows bar button gestures to suppress this close.
    const barGesture = new Gtk.GestureClick();
    barGesture.set_button(1);
    barGesture.connect("pressed", () => {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, () => {
            if (!WidgetManager.ConsumeNextBarClose()) {
                CloseAllMenus(settings, modulesRight, desktopMenu);
            }
            return GLib.SOURCE_REMOVE;
        });
    });
    barWindow.add_controller(barGesture);

    // Register windows with main app
    app.add_window(backdrop);
    app.add_window(modulesRight.popup);
    app.add_window(desktopMenu);
    app.add_window(settings);

    return barWindow;
}