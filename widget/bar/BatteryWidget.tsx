import { Gtk } from "ags/gtk4"
import AstalBattery from "gi://AstalBattery"
import { createBinding } from "ags"

export function BatteryWidget() {

    const battery = AstalBattery.get_default()

    const percent = createBinding(battery, "percentage",)((p) => `${Math.floor(p * 100)}%`)

    const percentBinding = createBinding(battery, "percentage",)

    const timeToEmpty = createBinding(battery, "time_to_empty",)((t) => {
        if (t === -1) {
            return "Calculating..."
        }
        const hours = Math.floor(t / 3600)
        const minutes = Math.floor((t % 3600) / 60)
        return `${hours}h ${minutes}m`
    })

    const formatTime = (t: any) => {
        if (t === -1 || !t) {
            return "...";
        }
        const hours = Math.floor(t / 3600);
        const minutes = Math.floor((t % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const timeToFull = createBinding(battery, "time_to_full",)((t) => formatTime(t))

    const energyRate = createBinding(battery, "energyRate",)((w) => `${Math.floor(w)}W`);

    const batteryState = createBinding(battery, "energy",)((e) => {
        const state = battery.state;
        switch (state) {
            case AstalBattery.State.CHARGING:
                return formatTime(battery.timeToFull);
            case AstalBattery.State.DISCHARGING:
                return formatTime(battery.timeToEmpty);
            case AstalBattery.State.EMPTY:
                return "Empty";
            case AstalBattery.State.FULLY_CHARGED:
            case AstalBattery.State.PENDING_CHARGE:
            case AstalBattery.State.PENDING_DISCHARGE:
                return "Charged";
            default:
                return "";
        }
    })

    const batteryTooltip = createBinding(battery, "state",)((s) => {
        let tooltip = "";
        let battery_state = ""

        switch (s) {
            case AstalBattery.State.CHARGING:
                battery_state = "Charging"
                break
            case AstalBattery.State.DISCHARGING:
                battery_state = "Discharging"
                break
            case AstalBattery.State.EMPTY:
                battery_state = "Empty"
                break
            case AstalBattery.State.FULLY_CHARGED:
                battery_state = "Fully Charged"
                break
            case AstalBattery.State.PENDING_CHARGE:
                battery_state = "Pending Charge"
                break
            case AstalBattery.State.PENDING_DISCHARGE:
                battery_state = "Pending Discharge"
                break
            default:
                battery_state = "Unknown Status"
        }

        tooltip = `<b>State:</b> ${battery_state} \n<b>Percentage:</b> ${percent.peek()} \n<b>Time to Empty:</b> ${timeToEmpty.peek()} \n<b>Time to Full:</b> ${timeToFull.peek()}\n<b>Energy Rate:</b> ${energyRate.peek()}`

        return tooltip;

    })

    return (
        <box cssName="battery-container" orientation={Gtk.Orientation.VERTICAL} tooltipMarkup={batteryTooltip}>
            <levelbar
                widthRequest={55}
                heightRequest={15}
                cssName={"battery-bar"}
                value={percentBinding.as(v => v)}
            />
            <label label={batteryState} cssName={"battery-percent"} />
        </box>

    )
}