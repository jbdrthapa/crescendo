import Gtk from "gi://Gtk?version=4.0";
import PopupWindow from "../PopupWindow";
import { Astal } from "ags/gtk4";
import app from "ags/gtk4/app";

import { SystemInfoWidget } from "./SystemInfoWidget";
import { PillWidgets } from "./PillWidgets";
import { DisplayControlsWidget } from "./DisplayControlsWidget";
import { AudioControlsWidget } from "./AudioControlsWidget";
import { PowerButtonsWidget } from "./PowerButtons";
import { WindowName } from "../../constants";

const windowName = WindowName.modulesRight;

export function ModulesRight() {
    const systemInfoWidget = SystemInfoWidget();
    const pillWidgets = PillWidgets();
    const displayControlsWidget = DisplayControlsWidget();
    const audioControlsWidget = AudioControlsWidget();
    const powerButtonsWidget = PowerButtonsWidget();

    const popup = new PopupWindow({
        name: windowName,
        namespace: windowName,
        anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT,
        margin: 2,
        application: app,
        marginTop: 10,
        marginLeft: 10,
        child: (
            <box
                cssName="modules-right-container"
                vexpand={false}
                valign={Gtk.Align.START}
                orientation={Gtk.Orientation.VERTICAL}
            >
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    vexpand={true}
                    valign={Gtk.Align.START}
                    spacing={20}
                >
                    <box
                        orientation={Gtk.Orientation.VERTICAL}
                        hexpand={false}
                        halign={Gtk.Align.CENTER}
                        cssName="system-info-pill-container"
                    >
                        {systemInfoWidget}
                        {pillWidgets}
                    </box>

                    {displayControlsWidget}
                    {audioControlsWidget}
                </box>
                <box
                    vexpand={false}
                    valign={Gtk.Align.END}
                    halign={Gtk.Align.CENTER}
                    cssName="power-button-container"
                >
                    {powerButtonsWidget}
                </box>
            </box>
        ),
    });

    popup.connect("notify::visible", () => {
        if (popup.visible) {
            // Reserved for future popup state synchronization.
        }
    });

    const button = (
        <button
            onClicked={() => popup.toggle()}
            cssName="bar-module-button"
        >
            <label label="󰣇" />
        </button>
    ) as Gtk.Button & { popup: InstanceType<typeof PopupWindow> };

    button.popup = popup;

    return button;
}
