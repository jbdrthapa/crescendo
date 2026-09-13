import Gtk from "gi://Gtk?version=4.0";
import { For, createBinding, createComputed } from "gnim";
import AstalBattery from "gi://AstalBattery?version=0.1";
import Utils from "../../Utils";

export function PowerSettings() {

    const upower = new AstalBattery.UPower();

    const devicesBinding = createComputed(() => upower.devices || []);

    const CONFIG_DIR = `${Utils.GetUserConfigDirectory()}/crescendo`;

    const STATE: Record<AstalBattery.State, [string, string]> = {
        0: [`${CONFIG_DIR}/assets/power/state/unknown.svg`, "Unknown"],
        1: [`${CONFIG_DIR}/assets/power/state/charging.svg`, "Charging"],
        2: [`${CONFIG_DIR}/assets/power/state/discharging.svg`, "Discharging"],
        3: [`${CONFIG_DIR}/assets/power/state/empty.svg`, "Empty"],
        4: [`${CONFIG_DIR}/assets/power/state/fully_charged.svg`, "Fully Charged"],
        5: [`${CONFIG_DIR}/assets/power/state/pending_charge.svg`, "Pending Charge"],
        6: [`${CONFIG_DIR}/assets/power/state/pending_discharge.svg`, "Pending Discharge"]
    };

    const TECHNOLOGY: Record<AstalBattery.Technology, [string, string]> = {
        0: [`${CONFIG_DIR}/assets/power/technology/unknown.svg`, "Unknown"],
        1: [`${CONFIG_DIR}/assets/power/technology/lithium_ion.svg`, "Lithium Ion"],
        2: [`${CONFIG_DIR}/assets/power/technology/lithium_polymer.svg`, "Lithium Polymer"],
        3: [`${CONFIG_DIR}/assets/power/technology/lithium_iron_phosphate.svg`, "Lithium Iron Phosphate"],
        4: [`${CONFIG_DIR}/assets/power/technology/lead_acid.svg`, "Lead Acid"],
        5: [`${CONFIG_DIR}/assets/power/technology/nickel_cadmium.svg`, "Nickel Cadmium"],
        6: [`${CONFIG_DIR}/assets/power/technology/nickel_metal_hydride.svg`, "Nickel Metal Hydride"],
    };

    const DEVICE_TYPE: Record<number, [string, string]> = {
        0: [`${CONFIG_DIR}/assets/power/type/unknown.svg`, "Unknown"],
        1: [`${CONFIG_DIR}/assets/power/type/line_power.svg`, "Line Power"],
        2: [`${CONFIG_DIR}/assets/power/type/battery.svg`, "Battery"],
        3: [`${CONFIG_DIR}/assets/power/type/ups.svg`, "UPS"],
        4: [`${CONFIG_DIR}/assets/power/type/monitor.svg`, "Monitor"],
        5: [`${CONFIG_DIR}/assets/power/type/mouse.svg`, "Mouse"],
        6: [`${CONFIG_DIR}/assets/power/type/keyboard.svg`, "Keyboard"],
        7: [`${CONFIG_DIR}/assets/power/type/pda.svg`, "PDA"],
        8: [`${CONFIG_DIR}/assets/power/type/phone.svg`, "Phone"],
        9: [`${CONFIG_DIR}/assets/power/type/media_player.svg`, "Media Player"],
        10: [`${CONFIG_DIR}/assets/power/type/tablet.svg`, "Tablet"],
        11: [`${CONFIG_DIR}/assets/power/type/computer.svg`, "Computer"],
        12: [`${CONFIG_DIR}/assets/power/type/gaming_input.svg`, "Gaming Input"],
        13: [`${CONFIG_DIR}/assets/power/type/pen.svg`, "Pen"],
        14: [`${CONFIG_DIR}/assets/power/type/touchpad.svg`, "Touchpad"],
        15: [`${CONFIG_DIR}/assets/power/type/modem.svg`, "Modem"],
        16: [`${CONFIG_DIR}/assets/power/type/network.svg`, "Network"],
        17: [`${CONFIG_DIR}/assets/power/type/headset.svg`, "Headset"],
        18: [`${CONFIG_DIR}/assets/power/type/speakers.svg`, "Speakers"],
        19: [`${CONFIG_DIR}/assets/power/type/headphones.svg`, "Headphones"],
        20: [`${CONFIG_DIR}/assets/power/type/video.svg`, "Video"],
        21: [`${CONFIG_DIR}/assets/power/type/other_audio.svg`, "Other Audio"],
        22: [`${CONFIG_DIR}/assets/power/type/remove_control.svg`, "Remove Control"],
        23: [`${CONFIG_DIR}/assets/power/type/printer.svg`, "Printer"],
        24: [`${CONFIG_DIR}/assets/power/type/scanner.svg`, "Scanner"],
        25: [`${CONFIG_DIR}/assets/power/type/camera.svg`, "Camera"],
        26: [`${CONFIG_DIR}/assets/power/type/wearable.svg`, "Wearable"],
        27: [`${CONFIG_DIR}/assets/power/type/toy.svg`, "Toy"],
        28: [`${CONFIG_DIR}/assets/power/type/bluetooth_generic.svg`, "Bluetooth Generic"],
    };

    function formatTime(seconds: number) {
        if (!seconds || seconds <= 0) return "";

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        const hourStr = hours > 0 ? `${hours}h ` : "";
        const minStr = minutes > 0 ? `${minutes}m` : "";

        return `${hourStr}${minStr}`.trim() || "0m";
    }

    const filteredDevices = createComputed(() =>
        devicesBinding().filter(device => device.deviceType !== AstalBattery.Type.LINE_POWER)
    );

    return (

        <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>

            <label label="Power Settings" halign={Gtk.Align.START} cssName="section-heading" />

            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={40}>
                <For each={filteredDevices}>
                    {(device) => {

                        const deviceTypeIconPath = createComputed(() => {
                            const rawDeviceType = createBinding(device, "deviceType");
                            return DEVICE_TYPE[rawDeviceType()][0] ?? "";
                        });

                        const deviceType = createComputed(() => {
                            const rawDeviceType = createBinding(device, "deviceType");
                            return DEVICE_TYPE[rawDeviceType()][1] ?? "Unknown";
                        });

                        const rawPercentage = createBinding(device, "percentage");

                        const batteryIconPath = createComputed(() => {
                            let percentage = rawPercentage();
                            if (percentage <= 0) return "${CONFIG_DIR}/assets/power/battery/battery_0.svg";
                            const rawValue = percentage * 100;
                            const percentValue = Math.min(100, Math.ceil(rawValue / 10) * 10);
                            let iconPath = `${CONFIG_DIR}/assets/power/battery/battery_${percentValue}.svg`;
                            return iconPath;
                        });

                        const vendor = createBinding(device, "vendor");

                        const hasVendor = vendor.as(v => v !== null && v !== undefined && v !== "");

                        const technologyIconPath = createComputed(() => {
                            const rawTechnology = createBinding(device, "technology");
                            return TECHNOLOGY[rawTechnology()][0];
                        });

                        const technology = createComputed(() => {
                            const rawTechnology = createBinding(device, "technology");
                            return TECHNOLOGY[rawTechnology()][1];
                        });

                        const supportsTechnology = technology.as(v => v !== null && v !== undefined && v !== "" && v !== "Unknown");

                        const stateIconPath = createComputed(() => {
                            const rawStateIconPath = createBinding(device, "state");
                            return STATE[rawStateIconPath()][0];
                        });

                        const state = createComputed(() => {
                            const rawState = createBinding(device, "state");
                            return STATE[rawState()][1];
                        });

                        const rawCapacity = createBinding(device, "capacity");

                        const capacity = createComputed(() => {
                            const formattedCapacity = `${Math.round((rawCapacity() ?? 0) * 100)} %`;
                            return formattedCapacity;
                        });

                        const percentage = createComputed(() => {
                            const formattedPercentage = `${Math.round((rawPercentage() ?? 0) * 100)} %`;
                            return formattedPercentage ?? "Unknown Device";
                        });

                        const energyFullDesign = createComputed(() => { const rawEnergyFullDesign = createBinding(device, "energyFullDesign"); return rawEnergyFullDesign.toString(); });
                        const energyFull = createComputed(() => { const rawEnergyFull = createBinding(device, "energyFull"); return rawEnergyFull.toString(); });
                        const energy = createComputed(() => { const rawEnergy = createBinding(device, "energy"); return rawEnergy.toString(); });

                        const energyRate = createComputed(() => { const rawEnergyRate = createBinding(device, "energyRate"); return rawEnergyRate().toFixed(1).toString() + " w"; });
                        const voltage = createComputed(() => { const rawVoltage = createBinding(device, "voltage"); return rawVoltage.toString(); });
                        const chargeCycles = createComputed(() => { const rawChargeCycles = createBinding(device, "chargeCycles"); return rawChargeCycles.toString(); });

                        const timeToEmpty = createComputed(() => {
                            const rawTimeToEmpty = createBinding(device, "timeToEmpty");
                            return formatTime(rawTimeToEmpty());
                        });

                        const hasTimeToEmtpy = timeToEmpty.as(v => v !== null && v !== undefined && v !== "");

                        const timeToFull = createComputed(() => {
                            const rawTimeToFull = createBinding(device, "timeToFull");
                            return formatTime(rawTimeToFull());
                        });

                        const hasTimeToFull = timeToFull.as(v => v !== null && v !== undefined && v !== "");

                        const temperature = createComputed(() => { const rawTemperature = createBinding(device, "temperature"); return rawTemperature.toString(); });

                        const charging = createBinding(device, "charging");

                        return (
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={10} cssName="section-background">

                                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={20}>
                                    <image file={deviceTypeIconPath} iconSize={Gtk.IconSize.LARGE} cssName="settings-param-icon" halign={Gtk.Align.START} />
                                    <label label={deviceType} cssName="settings-param-heading" halign={Gtk.Align.START} />
                                </box>

                                <box orientation={Gtk.Orientation.HORIZONTAL} halign={Gtk.Align.CENTER}>
                                    <Gtk.ProgressBar fraction={rawPercentage} ></Gtk.ProgressBar>
                                    <label label={percentage} css="font-weight:800; font-size:32px;" />
                                </box>


                                <box orientation={Gtk.Orientation.HORIZONTAL} visible={hasVendor} spacing={10}>
                                    <label label="Vendor" xalign={0} cssName="settings-param-caption" />
                                    <label label={vendor} css="min-width: 220px;" cssName="settings-param-value" halign={Gtk.Align.START} />
                                </box>

                                <box orientation={Gtk.Orientation.HORIZONTAL} visible={supportsTechnology} spacing={10}>
                                    <label label="Technology" xalign={0} cssName="settings-param-caption" />
                                    <label label={technology} css="min-width: 220px;" cssName="settings-param-value" halign={Gtk.Align.START} />
                                    <image file={technologyIconPath} tooltipText={technology} pixelSize={48} cssName="settings-param-icon" halign={Gtk.Align.START} />
                                </box>

                                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={10}>
                                    <label label="State" xalign={0} cssName="settings-param-caption" />
                                    <label label={state} css="min-width: 220px;" cssName="settings-param-value" halign={Gtk.Align.START} />
                                    <image file={stateIconPath} tooltipText={state} pixelSize={48} cssName="settings-param-icon" halign={Gtk.Align.START} />
                                </box>

                                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={10}>
                                    <label label="Rate" xalign={0} cssName="settings-param-caption" />
                                    <label label={energyRate} css="min-width: 220px;" cssName="settings-param-value" halign={Gtk.Align.START} />
                                </box>

                                <box orientation={Gtk.Orientation.HORIZONTAL} visible={hasTimeToFull} spacing={10}>
                                    <label label="Time to full" xalign={0} cssName="settings-param-caption" />
                                    <label label={timeToFull} css="min-width: 220px;" cssName="settings-param-value" halign={Gtk.Align.START} />
                                </box>

                                <box orientation={Gtk.Orientation.HORIZONTAL} visible={hasTimeToEmtpy} spacing={10}>
                                    <label label="Time to empty" xalign={0} cssName="settings-param-caption" />
                                    <label label={timeToEmpty} css="min-width: 220px;" cssName="settings-param-value" halign={Gtk.Align.START} />
                                </box>

                                <box orientation={Gtk.Orientation.HORIZONTAL} visible={hasVendor} spacing={10}>
                                    <label label="Capacity" xalign={0} cssName="settings-param-caption" />
                                    <Gtk.ProgressBar fraction={rawCapacity} valign={Gtk.Align.CENTER}></Gtk.ProgressBar>
                                    <label label={capacity} css="min-width: 50px;" cssName="settings-param-value" halign={Gtk.Align.START} />
                                </box>

                                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={10}>
                                    <label label="Percentage" xalign={0} cssName="settings-param-caption" />
                                    <Gtk.ProgressBar fraction={rawPercentage} valign={Gtk.Align.CENTER}></Gtk.ProgressBar>
                                    <label label={percentage} css="min-width: 50px;" cssName="settings-param-value" halign={Gtk.Align.START} />
                                </box>

                            </box>
                        );
                    }}
                </For>
            </box>


        </box >

    );
}


