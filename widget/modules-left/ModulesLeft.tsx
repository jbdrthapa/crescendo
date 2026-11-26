import Gtk from "gi://Gtk?version=4.0";
import WidgetManager from "../../WidgetManager"

export function ModulesLeft() {
    const button = (
        <button
            cssName="bar-module-button"
        >
            <label label="" />
        </button>
    ) as Gtk.Button;

    const gesture = new Gtk.GestureClick();
    gesture.set_button(1);
    gesture.connect("pressed", () => {
        WidgetManager.SuppressNextBarClose();
        const settings = WidgetManager.GetSettingsWindow();

        if (settings.isOpen()) {
            settings.hide_all();
            return;
        }

        settings.Apps();
        settings.toggle();
    });
    button.add_controller(gesture);

    return button;
}
