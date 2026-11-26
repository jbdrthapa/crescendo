import Gtk from "gi://Gtk?version=4.0";
import { DisplayWidget } from "./DisplayWidget";
import { BluetoothWidget } from "./BluetoothWidget";
import { WiredNetworkWidget } from "./WiredNetworkWidget";
import { WirelessNetworkWidget } from "./WirelessNetworkWidget";
import { VPNWidget } from "./VPNWidget";
import { AccordionController } from "./AccordionController";

export function PillWidgets() {
    const accordion = new AccordionController();

    const displayWidget = DisplayWidget(accordion);
    const bluetoothWidget = BluetoothWidget(accordion);
    const wiredNetworkWidget = WiredNetworkWidget(accordion);
    const vpnWidget = VPNWidget(accordion);
    const wirelessNetworkWidget = WirelessNetworkWidget(accordion);

    return (
        <box orientation={Gtk.Orientation.VERTICAL}>
            <box orientation={Gtk.Orientation.VERTICAL}>
                <box orientation={Gtk.Orientation.HORIZONTAL}>
                    <box orientation={Gtk.Orientation.VERTICAL}>
                        {displayWidget}
                    </box>
                    <box orientation={Gtk.Orientation.VERTICAL}>
                        {bluetoothWidget}
                    </box>
                </box>
            </box>
            <box orientation={Gtk.Orientation.VERTICAL}>
                <box orientation={Gtk.Orientation.HORIZONTAL}>
                    <box orientation={Gtk.Orientation.VERTICAL}>
                        {wiredNetworkWidget}
                    </box>
                    <box orientation={Gtk.Orientation.VERTICAL}>
                        {wirelessNetworkWidget}
                    </box>
                </box>
            </box>
            <box orientation={Gtk.Orientation.VERTICAL}>
                <box orientation={Gtk.Orientation.HORIZONTAL}>
                    <box orientation={Gtk.Orientation.VERTICAL}>
                        {vpnWidget}
                    </box>
                    <box orientation={Gtk.Orientation.VERTICAL}>

                    </box>
                </box>

            </box>
        </box>
    );
}