import GLib from "gi://GLib";
import Gtk from "gi://Gtk?version=4.0";
import { AccordionController } from "./AccordionController";
import { PillWidget } from "./PillWidget";
import { createBinding, createComputed } from "gnim";
import { execAsync } from "ags/process";
import Network from "gi://AstalNetwork";

export function WiredNetworkWidget(controller: AccordionController) {


    const NM_STATE: Record<number, string> = {
        0: "Unknown",
        10: "Unmanaged",
        20: "Unavailable",
        30: "Disconnected",
        40: "Prepare",
        50: "Config",
        60: "Need Auth",
        70: "IP Config",
        80: "IP Check",
        90: "Secondaries",
        100: "Activated",
        110: "Deactivating",
        120: "Failed"
    };

    const NM_SPEED: Record<number, string> = {
        // Unknown / link down
        0: "Unknown",
        10: "10 Mbps",
        100: "100 Mbps",
        1000: "1 Gbps",
        // Multi‑Gig speeds (AstalNetwork / NMDeviceEthernet raw values)
        2500: "2.5 Gbps",
        5000: "5 Gbps",
        // High‑speed NICs
        10000: "10 Gbps",
        25000: "25 Gbps",
        100000: "100 Gbps"
    };

    let detail = "";

    const network = Network.get_default();

    const wired = network.wired;

    if (!wired) {
        detail = "Unavailable"
        return;
    }

    const device = createBinding(wired, "device");

    if(!device()) {
        detail = "Unavailable"
        return;
    }

    const iconName = createBinding(wired, "iconName");

    const deviceInterface = createComputed(() => {
        return device().interface;
    });

    const macAddress = createComputed(() => {
        return device().hwAddress;
    });

    const mtu = createComputed(() => {
        return device().mtu.toString();
    });

    const rawState = createBinding(wired, "state");
    const state = createComputed(() => {
        return NM_STATE[rawState()] ?? "?";
    });

    const stateNames: Record<number, string> = {
        [Network.DeviceState.UNKNOWN]: "Unknown",
        [Network.DeviceState.UNMANAGED]: "Unmanaged",
        [Network.DeviceState.UNAVAILABLE]: "Unavailable",
        [Network.DeviceState.DISCONNECTED]: "Disconnected",
        [Network.DeviceState.PREPARE]: "Preparing",
        [Network.DeviceState.CONFIG]: "Configuring",
        [Network.DeviceState.NEED_AUTH]: "Needs Auth",
        [Network.DeviceState.IP_CONFIG]: "IP Config",
        [Network.DeviceState.IP_CHECK]: "Checking IP",
        [Network.DeviceState.SECONDARIES]: "Secondaries",
        [Network.DeviceState.DEACTIVATING]: "Deactivating",
        [Network.DeviceState.FAILED]: "Failed",
    };

    const statePillLabel = createComputed(() => {
        let stateInfo = rawState();
        if (stateInfo == Network.DeviceState.ACTIVATED) {
            return device().interface;
        } else {
            return stateNames[stateInfo];
        }
    });

    const rawSpeed = createBinding(wired, "speed");
    const speed = createComputed(() => {
        return NM_SPEED[rawSpeed()] ?? "?";
    });


    const refreshNetworkButton = (
        <button cssName="pill-content-button" label="" vexpand={false} hexpand={false} halign={Gtk.Align.CENTER} />
    ) as Gtk.Button;

    function waitForOperState(iface: string, target: string): Promise<void> {
        return new Promise(resolve => {
            const check = () => {
                try {
                    const [ok, bytes] = GLib.file_get_contents(`/sys/class/net/${iface}/operstate`);
                    const state = new TextDecoder().decode(bytes).trim();

                    if (state === target) {
                        resolve();
                    } else {
                        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                            check();
                            return GLib.SOURCE_REMOVE;
                        });
                    }
                } catch {
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                        check();
                        return GLib.SOURCE_REMOVE;
                    });
                }
            };

            check();
        });
    }


    refreshNetworkButton.connect("clicked", async () => {
        const iface = deviceInterface();

        try {
            await execAsync(`sudo ip link set dev ${iface} down`);
            console.log("Bringing wired network down…");

            await waitForOperState(iface, "down");
            console.log("Interface is now down.");

            await execAsync(`sudo ip link set dev ${iface} up`);
            console.log("Bringing wired network up…");

        } catch (err) {
            console.error("Failed to toggle wired network:", err);
        }
    });

    const content = (
        <box orientation={Gtk.Orientation.VERTICAL} cssName="pill-content" spacing={2}>
            <label label="W I R E D" cssName={"pill-content-header"} />
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={5}>
                {refreshNetworkButton}
            </box>
            <box orientation={Gtk.Orientation.HORIZONTAL}>
                <image iconSize={Gtk.IconSize.NORMAL} iconName={iconName} cssName="pill-param-caption" halign={Gtk.Align.START} />
                <label label={deviceInterface} cssName="pill-param-value" halign={Gtk.Align.START} />
            </box>
            <box orientation={Gtk.Orientation.HORIZONTAL}>
                <label label="MAC" xalign={0} cssName="pill-param-caption" halign={Gtk.Align.START} />
                <label label={macAddress} cssName="pill-param-value" halign={Gtk.Align.START} />
            </box>
            <box orientation={Gtk.Orientation.HORIZONTAL}>
                <label label="State" xalign={0} cssName="pill-param-caption" halign={Gtk.Align.START} />
                <label label={state} cssName="pill-param-value" halign={Gtk.Align.START} />
            </box>
            <box orientation={Gtk.Orientation.HORIZONTAL}>
                <label label="Speed" xalign={0} cssName="pill-param-caption" halign={Gtk.Align.START} />
                <label label={speed} cssName="pill-param-value" halign={Gtk.Align.START} />
            </box>
        </box>
    ) as Gtk.Box;

    return PillWidget({
        id: "wired-network",
        controller: controller,
        iconName: "󰈀",
        title: "Wired",
        detail: statePillLabel,
        content,
    });
}
