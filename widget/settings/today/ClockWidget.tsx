import Gtk from "gi://Gtk?version=4.0";
import { createBinding } from "gnim";
import TimeService from "../../../services/TimeService";
import { WorldClocks } from "../../../services/WorldClocks";

export function ClockWidget({ time_fmt = "%H:%M", date_fmt = "%a, %b %e" } = {}) {
    const timeService = TimeService.get_default();
    const time = createBinding(timeService, "time");
    const hours = time.as(value => value?.split(":")[0] || "");
    const minutes = time.as(value => value?.split(":")[1] || "");

    const worldClocks = WorldClocks({ time_fmt, date_fmt });

    return (
        <box orientation={Gtk.Orientation.VERTICAL} cssName="time-container" spacing={30}>
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={20}>
                <label cssName="local-clock-hours" label={hours} />
                <label cssName="local-clock-minutes" label={minutes} />
            </box>

            <box cssName="world-clock-panel">
                <box orientation={Gtk.Orientation.VERTICAL} spacing={20}>
                    {worldClocks.map(worldClock => (
                        <box orientation={Gtk.Orientation.HORIZONTAL}>
                            <label xalign={0} cssName="world-clock-name" label={time.as(() => worldClock.name())} />
                            <label xalign={0} cssName="world-clock-time" label={time.as(() => worldClock.time())} />
                        </box>
                    ))}
                </box>
            </box>
        </box>
    );
}