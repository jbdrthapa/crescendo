import { Astal, Gtk, Gdk } from "ags/gtk4";
import { createBinding, createState } from "ags";
import Wp from "gi://AstalWp";
import app from "ags/gtk4/app";
import { WindowName } from "../../constants";
import { TimerManager } from "../../TimerManager";

const ANIMATION_TIME = 2000;

export default function OsdMicrophone(gdkmonitor: Gdk.Monitor) {
    let delayId: number | null = null;
    let initCount = 2;
    const timers = new TimerManager();

    const windowName = WindowName.osd;

    const microphone = Wp.get_default()?.get_audio().defaultMicrophone;
    if (!microphone) return <box />;

    const volumeBinding = createBinding(microphone, "volume");
    const iconBinding = volumeBinding.as(v => {
        if (v === 0) return "audio-input-microphone-muted-symbolic";
        if (v < 0.33) return "audio-input-microphone-low-symbolic";
        if (v < 0.66) return "audio-input-microphone-low-symbolic";
        if (v <= 1.0) return "audio-input-microphone-high-symbolic";
        return "audio-input-microphone-high-symbolic";
    });

    const [visible, setVisible] = createState(false);

    function showOsd() {
        if (initCount > 0) {
            initCount--;
            return;
        }

        setVisible(true);

        if (delayId) timers.remove(delayId);

        delayId = timers.once(ANIMATION_TIME, () => {
            setVisible(false);
            delayId = null;
        });
    }

    microphone.connect("notify::volume", () => showOsd());
    microphone.connect("notify::mute", () => showOsd());

    const osdMicrophone = (
        <window
            application={app}   // ⭐ REQUIRED
            name={windowName}
            namespace={windowName}
            gdkmonitor={gdkmonitor}
            cssName={"osd-window"}
            anchor={Astal.WindowAnchor.BOTTOM}
            layer={Astal.Layer.OVERLAY}
            visible={visible}
        >
            <box cssName={"osd-box"} orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                <label label={"Microphone"} hexpand={false} halign={Gtk.Align.CENTER} cssName="osd-device-name" />
                <image iconName={iconBinding} pixelSize={32} cssName={"osd-box-icon"} />
                <label label={volumeBinding.as(v => `${Math.round(v * 100)}`)} cssName={"osd-box-label"} />
                <levelbar
                    widthRequest={100}
                    heightRequest={25}
                    cssClasses={["osd-bar"]}
                    minValue={0}
                    maxValue={1.5}
                    value={volumeBinding.as(v => v)}
                    valign={Gtk.Align.CENTER}
                    hexpand={true}
                />
            </box>
        </window>
    ) as Gtk.Window;

    return osdMicrophone;
}
