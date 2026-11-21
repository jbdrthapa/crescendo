import Gtk from "gi://Gtk?version=4.0";
import Network from "gi://AstalNetwork";
import { createState, onCleanup } from "ags";

export function WirelessWidget() {
    const network = Network.get_default();
    const [visible, setVisible] = createState(false);
    const [iconName, setIconName] = createState("󰤨");

    let wifi: Network.Wifi | null = null;
    let stateHandler = 0;
    let deviceHandler = 0;
    let activeAccessPointHandler = 0;
    let iconNameHandler = 0;

    const update = () => {
        if (!wifi) {
            setVisible(false);
            setIconName("󰤨");
            return;
        }

        try {
            const active = !!wifi.device
                && wifi.state === Network.DeviceState.ACTIVATED
                && !!wifi.activeAccessPoint;
            setVisible(active);

            const dynamicIcon = wifi.iconName;
            if (dynamicIcon) setIconName(dynamicIcon);
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
            } catch {}
        }

        wifi = next;
        stateHandler = 0;
        deviceHandler = 0;
        activeAccessPointHandler = 0;
        iconNameHandler = 0;

        if (wifi) {
            stateHandler = wifi.connect("notify::state", update);
            deviceHandler = wifi.connect("notify::device", update);
            activeAccessPointHandler = wifi.connect("notify::active-access-point", update);
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
            } catch {}
        }
    });

    return (
        <box
            cssName="wireless-container"
            tooltipText="Wireless connected"
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
