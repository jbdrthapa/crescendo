import { Astal, Gtk, Gdk } from "ags/gtk4";
import { createBinding, createState } from "ags";
import DisplayService from "../../services/DisplayService";
import app from "ags/gtk4/app";
import { WindowName } from "../../constants";
import { TimerManager } from "../../TimerManager";

const ANIMATION_TIME = 2000;

export default function OsdBrightness(gdkmonitor: Gdk.Monitor) {
    let delayId: number | null = null;
    let initCount = 5;
    const timers = new TimerManager();

    const windowName = WindowName.osd;

    const brightness = DisplayService.get_default() as any;
    if (!brightness) return <box />;

    const brightnessBinding = createBinding(brightness, "brightness_percent");
    const iconBinding = createBinding(brightness, "brightness_icon");

    const levelBarBinding = brightnessBinding.as(p => (p ?? 0) / 100);
    const textPercentBinding = brightnessBinding.as(p => `${Math.round(p ?? 0)}%`);

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

    brightness.connect("notify::brightness-percent", () => showOsd());
    brightness.connect("notify::brightness-icon", () => showOsd());

    const osdBrightness = (
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
                <label label={"Brightness"} hexpand={false} halign={Gtk.Align.CENTER} cssName="osd-device-name" />
                <label label={iconBinding} css="font-size: 24px;" cssName={"osd-box-icon"} />
                <label label={textPercentBinding} cssName={"osd-box-label"} />
                <levelbar
                    widthRequest={100}
                    heightRequest={25}
                    cssClasses={["osd-bar"]}
                    value={levelBarBinding}
                    valign={Gtk.Align.CENTER}
                    hexpand={true}
                />
            </box>
        </window>
    ) as Gtk.Window;

    return osdBrightness;
}