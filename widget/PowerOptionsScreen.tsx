import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import app from "ags/gtk4/app";
import { Astal } from "ags/gtk4";
import { WindowName } from "../constants";
import { createState } from "gnim";
import { TimerManager } from "../TimerManager";

const windowName = WindowName.powerOptions;

export function PowerOptionsScreen() {


    const [reveal, setReveal] = createState(true);
    const timers = new TimerManager();

    const revealerWidget = (
        <revealer
            revealChild={reveal}
            transitionType={Gtk.RevealerTransitionType.FADE_SLIDE_UP}
            transitionDuration={1000}
            vexpand={true}
            hexpand={true}
            cssName="power-options-background"

            $={() => {
                timers.once(10, () => setReveal(true));
            }}
        >
            <box vexpand={true} hexpand={true} valign={Gtk.Align.START} halign={Gtk.Align.CENTER} orientation={Gtk.Orientation.VERTICAL} spacing={20} marginTop={60}>
                <box orientation={Gtk.Orientation.HORIZONTAL} cssName="power-button-box" halign={Gtk.Align.CENTER} spacing={35}>

                    <box orientation={Gtk.Orientation.VERTICAL} spacing={20} cssName="power-button-container-large">
                        <button label="󰿅" cssName="power-button-large" onClicked={() => {
                            slideDownAndHide("niri msg action quit --skip-confirmation");
                        }} />
                        <label label={"Logout"} tooltipText="Log Off" cssName="power-button-caption" />
                    </box>

                    <box orientation={Gtk.Orientation.VERTICAL} spacing={20} cssName="power-button-container-large">
                        <button label="" cssName="power-button-large" onClicked={() => {
                            slideDownAndHide("systemctl reboot");
                        }} />
                        <label label={"Reboot"} tooltipText="Reboot" cssName="power-button-caption" />
                    </box>

                    <box orientation={Gtk.Orientation.VERTICAL} spacing={20} cssName="power-button-container-large">
                        <button label="" cssName="power-button-large" onClicked={() => {
                            slideDownAndHide("systemctl poweroff");
                        }} />
                        <label label={"Halt"} tooltipText="Power Off" cssName="power-button-caption" />
                    </box>

                    <box orientation={Gtk.Orientation.VERTICAL} spacing={20} cssName="power-button-container-large">
                        <button label="" cssName="power-button-large" onClicked={() => {
                            slideDownAndHide();
                        }} />
                        <label label={"Cancel"} tooltipText="Cancel" cssName="power-button-caption" />
                    </box>
                </box>
            </box>
        </revealer>
    );

    const powerOptionsWindow = (
        <window
            name={windowName}
            namespace={windowName}
            keymode={Astal.Keymode.EXCLUSIVE}
            modal={true}
            layer={Astal.Layer.OVERLAY}
            visible={false}
            exclusivity={Astal.Exclusivity.IGNORE}
            css={"background: none; "}
            anchor={
                Astal.WindowAnchor.TOP |
                Astal.WindowAnchor.BOTTOM |
                Astal.WindowAnchor.LEFT |
                Astal.WindowAnchor.RIGHT
            }
            application={app}
        >
            {revealerWidget}
        </window>
    ) as Astal.Window;

    function slideDownAndHide(cmd: string = "") {

        setReveal(false);

        timers.once(1000, () => {
            powerOptionsWindow.hide();

            if (cmd) {
                GLib.spawn_command_line_async(cmd);
            }

            setReveal(true);
        });
    }

    return powerOptionsWindow;
}
