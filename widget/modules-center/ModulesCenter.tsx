import Gtk from "gi://Gtk?version=4.0"
import TimeService from "../../services/TimeService"
import { createBinding } from "gnim"
import WidgetManager from "../../WidgetManager"
import WeatherService from "../../services/WeatherService";

export function WeatherBarWidget() {

    const weatherService = WeatherService.get_default();

    return (
        <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.CENTER} spacing={10}>
            <label halign={Gtk.Align.CENTER} label={createBinding(weatherService, "icon")} cssName="bar-weather-icon" />
            <label halign={Gtk.Align.CENTER} label={createBinding(weatherService, "temperature")} cssName="bar-weather-temperature" />
        </box>
    );
}

export function ModulesCenter() {

    const weatherBarWidget = WeatherBarWidget();
    const timeService = TimeService.get_default();
    const time = createBinding(timeService, "time");
    const hour = time.as(value => value?.split(":")[0] || "");
    const minute = time.as(value => value?.split(":")[1] || "");

    const button = (
        <box hexpand={false} halign={Gtk.Align.CENTER} cssName={"date-time-weather-container"}>
            <button onClicked={() => {
                let settings = WidgetManager.GetSettingsWindow();
                settings?.Today();
                settings?.toggle();
            }} >
                <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.CENTER} spacing={15}>
                    <box halign={Gtk.Align.CENTER} orientation={Gtk.Orientation.VERTICAL}>
                        <label label={hour} halign={Gtk.Align.CENTER} cssName={"bar-hour"} />
                        <label label={minute} halign={Gtk.Align.CENTER} cssName={"bar-minute"} />
                    </box>
                    <box>
                        {weatherBarWidget}
                    </box>
                </box>
            </button>
        </box>
    ) as any;

    return button;

}
