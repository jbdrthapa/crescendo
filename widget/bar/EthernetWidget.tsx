import Gtk from "gi://Gtk?version=4.0";
import Network from "gi://AstalNetwork";
import { createState, onCleanup } from "ags";

export function EthernetWidget() {
    const network = Network.get_default();
    const [visible, setVisible] = createState(false);

    let wired: Network.Wired | null = null;
    let stateHandler = 0;
    let deviceHandler = 0;

    const update = () => {
        if (!wired) {
            setVisible(false);
            return;
        }

        try {
            const active = !!wired.device && wired.state === Network.DeviceState.ACTIVATED;
            setVisible(active);
        } catch {
            setVisible(false);
        }
    };

    const watchWired = (next: Network.Wired | null) => {
        if (wired) {
            try {
                if (stateHandler) wired.disconnect(stateHandler);
            } catch {}
            try {
                if (deviceHandler) wired.disconnect(deviceHandler);
            } catch {}
        }

        wired = next;
        stateHandler = 0;
        deviceHandler = 0;

        if (wired) {
            stateHandler = wired.connect("notify::state", update);
            deviceHandler = wired.connect("notify::device", update);
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
            } catch {}
            try {
                if (deviceHandler) wired.disconnect(deviceHandler);
            } catch {}
        }
    });

    return (
        <box
            cssName="ethernet-container"
            tooltipText="Ethernet connected"
            visible={visible}
        >
            <label label="" cssName="ethernet-icon" hexpand halign={Gtk.Align.CENTER} />
        </box>
    );
}
