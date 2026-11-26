import Gtk from "gi://Gtk?version=4.0";
import Network from "gi://AstalNetwork";
import { createState, onCleanup } from "ags";
import { execAsync } from "ags/process";
import { createComputed } from "gnim";

export function WirelessWidget() {
    const network = Network.get_default();
    const [visible, setVisible] = createState(false);
    const [iconName, setIconName] = createState("󰤨");
    const [ssid, setSsid] = createState("Unknown");
    const [bssid, setBssid] = createState("Unknown");
    const [ipAddress, setIpAddress] = createState("Unavailable");
    const [macAddress, setMacAddress] = createState("Unavailable");
    const [signal, setSignal] = createState("Unknown");
    const [interfaceName, setInterfaceName] = createState("Unknown");

    let wifi: Network.Wifi | null = null;
    let stateHandler = 0;
    let deviceHandler = 0;
    let activeAccessPointHandler = 0;
    let iconNameHandler = 0;
    let strengthHandler = 0;
    let ssidHandler = 0;
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

        detailDevice = wifi?.device || null;
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
    };

    const update = () => {
        if (!wifi) {
            setVisible(false);
            setIconName("󰤨");
            setSsid("Unknown");
            setBssid("Unknown");
            setSignal("Unknown");
            setInterfaceName("Unknown");
            setMacAddress("Unavailable");
            setIpAddress("Unavailable");
            return;
        }

        try {
            const active = !!wifi.device
                && wifi.state === Network.DeviceState.ACTIVATED
                && !!wifi.activeAccessPoint;
            setVisible(active);

            const dynamicIcon = wifi.iconName;
            if (dynamicIcon) setIconName(dynamicIcon);

            setSsid(wifi.ssid || wifi.activeAccessPoint?.ssid || "Unknown");
            setBssid(wifi.activeAccessPoint?.bssid || "Unknown");
            setSignal(typeof wifi.strength === "number" ? `${wifi.strength}%` : "Unknown");
            updateDeviceDetails();
        } catch {
            setVisible(false);
            setIconName("󰤨");
        }
    };

    const watchWifi = (next: Network.Wifi | null) => {
        if (wifi) {
            try {
                if (stateHandler) wifi.disconnect(stateHandler);
                if (deviceHandler) wifi.disconnect(deviceHandler);
                if (activeAccessPointHandler) wifi.disconnect(activeAccessPointHandler);
                if (iconNameHandler) wifi.disconnect(iconNameHandler);
                if (strengthHandler) wifi.disconnect(strengthHandler);
                if (ssidHandler) wifi.disconnect(ssidHandler);
            } catch {}
            if (detailDevice) {
                try {
                    if (ipHandler) detailDevice.disconnect(ipHandler);
                    if (macHandler) detailDevice.disconnect(macHandler);
                } catch {}
            }
        }

        wifi = next;
        stateHandler = 0;
        deviceHandler = 0;
        activeAccessPointHandler = 0;
        iconNameHandler = 0;
        strengthHandler = 0;
        ssidHandler = 0;
        detailDevice = null;
        ipHandler = 0;
        macHandler = 0;

        if (wifi) {
            stateHandler = wifi.connect("notify::state", update);
            deviceHandler = wifi.connect("notify::device", update);
            activeAccessPointHandler = wifi.connect("notify::active-access-point", update);
            strengthHandler = wifi.connect("notify::strength", update);
            ssidHandler = wifi.connect("notify::ssid", update);
            iconNameHandler = wifi.connect("notify::icon-name", () => {
                setIconName(wifi?.iconName || "󰤨");
            });
        }

        update();
    };

    const wifiChangedHandler = network.connect("notify::wifi", () => {
        try {
            watchWifi(network.wifi);
        } catch {
            watchWifi(null);
        }
    });

    watchWifi(network.wifi);

    onCleanup(() => {
        network.disconnect(wifiChangedHandler);
        if (wifi) {
            try {
                if (stateHandler) wifi.disconnect(stateHandler);
                if (deviceHandler) wifi.disconnect(deviceHandler);
                if (activeAccessPointHandler) wifi.disconnect(activeAccessPointHandler);
                if (iconNameHandler) wifi.disconnect(iconNameHandler);
                if (strengthHandler) wifi.disconnect(strengthHandler);
                if (ssidHandler) wifi.disconnect(ssidHandler);
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
        `SSID: ${ssid()}\nIP: ${ipAddress()}\nMAC: ${macAddress()}\nSignal: ${signal()}`
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
                        {detailRow("SSID", ssid)}
                        {detailRow("Interface", interfaceName)}
                        {detailRow("IP address", ipAddress)}
                        {detailRow("MAC address", macAddress)}
                        {detailRow("Access point", bssid)}
                        {detailRow("Signal", signal)}
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
            cssName="wireless-container"
            tooltipText={tooltipText}
            visible={visible}
        >
            <image
                iconName={iconName}
                iconSize={Gtk.IconSize.NORMAL}
                cssName="wireless-icon"
                hexpand
                halign={Gtk.Align.CENTER}
            />
        </box>
    );
}
