import Gtk from "gi://Gtk?version=4.0";
import Network from "gi://AstalNetwork";
import { createState, onCleanup } from "ags";
import { execAsync } from "ags/process";
import { createComputed } from "gnim";

export function EthernetWidget() {
    const network = Network.get_default();
    const [visible, setVisible] = createState(false);
    const [ipAddress, setIpAddress] = createState("Unavailable");
    const [macAddress, setMacAddress] = createState("Unavailable");
    const [interfaceName, setInterfaceName] = createState("Unknown");
    const [linkSpeed, setLinkSpeed] = createState("Unknown");

    let wired: Network.Wired | null = null;
    let stateHandler = 0;
    let deviceHandler = 0;
    let speedHandler = 0;
    let detailDevice: any = null;
    let ipHandler = 0;
    let macHandler = 0;

    const copyToClipboard = (text: string) => {
        if (!text || text === "Unavailable" || text === "Unknown") return;

        const script = `
            if command -v wl-copy >/dev/null 2>&1; then
                printf %s "$1" | wl-copy
            elif command -v xclip >/dev/null 2>&1; then
                printf %s "$1" | xclip -selection clipboard
            elif command -v xsel >/dev/null 2>&1; then
                printf %s "$1" | xsel --clipboard --input
            else
                exit 127
            fi
        `;

        execAsync(["bash", "-lc", script, "bash", text]).catch((error) => {
            print(`Clipboard copy failed: ${error}`);
        });
    };

    const updateDeviceDetails = () => {
        if (detailDevice) {
            try {
                if (ipHandler) detailDevice.disconnect(ipHandler);
                if (macHandler) detailDevice.disconnect(macHandler);
            } catch {}
        }

        detailDevice = wired?.device || null;
        ipHandler = 0;
        macHandler = 0;

        if (detailDevice) {
            try {
                ipHandler = detailDevice.connect("notify::ip4-config", update);
                macHandler = detailDevice.connect("notify::hw-address", update);
            } catch {}

            try {
                setInterfaceName(detailDevice.interface || "Unknown");
                setMacAddress(detailDevice.hwAddress || "Unavailable");

                const ipConfig = detailDevice.ip4Config;
                const addresses = ipConfig?.get_addresses?.() || [];
                const firstAddress = addresses[0] as any;
                setIpAddress(firstAddress?.get_address?.()
                    || firstAddress?.address
                    || "Unavailable");
            } catch {
                setInterfaceName("Unknown");
                setMacAddress("Unavailable");
                setIpAddress("Unavailable");
            }
        } else {
            setInterfaceName("Unknown");
            setMacAddress("Unavailable");
            setIpAddress("Unavailable");
        }

        const speed = wired?.speed;
        setLinkSpeed(typeof speed === "number" && speed > 0 ? `${speed} Mb/s` : "Unknown");
    };

    const update = () => {
        if (!wired) {
            setVisible(false);
            setInterfaceName("Unknown");
            setMacAddress("Unavailable");
            setIpAddress("Unavailable");
            setLinkSpeed("Unknown");
            return;
        }

        try {
            const active = !!wired.device && wired.state === Network.DeviceState.ACTIVATED;
            setVisible(active);
            updateDeviceDetails();
        } catch {
            setVisible(false);
        }
    };

    const watchWired = (next: Network.Wired | null) => {
        if (wired) {
            try {
                if (stateHandler) wired.disconnect(stateHandler);
                if (deviceHandler) wired.disconnect(deviceHandler);
                if (speedHandler) wired.disconnect(speedHandler);
            } catch {}
            if (detailDevice) {
                try {
                    if (ipHandler) detailDevice.disconnect(ipHandler);
                    if (macHandler) detailDevice.disconnect(macHandler);
                } catch {}
            }
        }

        wired = next;
        stateHandler = 0;
        deviceHandler = 0;
        speedHandler = 0;
        detailDevice = null;
        ipHandler = 0;
        macHandler = 0;

        if (wired) {
            stateHandler = wired.connect("notify::state", update);
            deviceHandler = wired.connect("notify::device", update);
            speedHandler = wired.connect("notify::speed", update);
        }

        update();
    };

    const wiredChangedHandler = network.connect("notify::wired", () => {
        try {
            watchWired(network.wired);
        } catch {
            watchWired(null);
        }
    });

    watchWired(network.wired);

    onCleanup(() => {
        network.disconnect(wiredChangedHandler);
        if (wired) {
            try {
                if (stateHandler) wired.disconnect(stateHandler);
                if (deviceHandler) wired.disconnect(deviceHandler);
                if (speedHandler) wired.disconnect(speedHandler);
            } catch {}
        }
        if (detailDevice) {
            try {
                if (ipHandler) detailDevice.disconnect(ipHandler);
                if (macHandler) detailDevice.disconnect(macHandler);
            } catch {}
        }
    });

    const detailRow = (label: string, value: () => string) => (
        <button
            cssName="wireless-detail-row"
            onClicked={() => copyToClipboard(value())}
            tooltipText={`Copy ${label}`}
        >
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                <label label={`${label}:`} cssName="wireless-detail-label" xalign={0} hexpand />
                <label label={createComputed(() => value())} cssName="wireless-detail-value" xalign={1} />
                <label label="󰆏" cssName="wireless-copy-icon" />
            </box>
        </button>
    );

    const tooltipText = createComputed(() =>
        `Interface: ${interfaceName()}\nIP: ${ipAddress()}\nMAC: ${macAddress()}\nSpeed: ${linkSpeed()}`
    );

    return (
        <box
            $={(self: Gtk.Box) => {
                const popover = new Gtk.Popover({
                    has_arrow: true,
                    position: Gtk.PositionType.LEFT,
                });
                popover.set_parent(self);

                const content = (
                    <box cssName="wireless-popover" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                        {detailRow("Interface", interfaceName)}
                        {detailRow("IP address", ipAddress)}
                        {detailRow("MAC address", macAddress)}
                        {detailRow("Link speed", linkSpeed)}
                    </box>
                ) as Gtk.Box;
                popover.set_child(content);

                const gesture = new Gtk.GestureClick();
                gesture.connect("released", () => {
                    update();
                    popover.popup();
                });
                self.add_controller(gesture);

                onCleanup(() => popover.unparent());
            }}
            cssName="ethernet-container"
            tooltipText={tooltipText}
            visible={visible}
        >
            <label label="" cssName="ethernet-icon" hexpand halign={Gtk.Align.CENTER} />
        </box>
    );
}
