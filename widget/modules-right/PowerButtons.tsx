import Gtk from "gi://Gtk?version=4.0";
import app from "ags/gtk4/app";
import { WindowName } from "../../constants";
import WidgetManager from "../../WidgetManager";
import { PowerOptionsScreen } from "../PowerOptionsScreen";

export function PowerButtonsWidget() {

    const modulesRightWindowName = WindowName.modulesRight;
    const lockScreen = WidgetManager.GetLockScreenWindow();
    const powerOptionsWindow = PowerOptionsScreen();

    return (
        <box orientation={Gtk.Orientation.HORIZONTAL} halign={Gtk.Align.CENTER} spacing={35}>
            <button label="" cssName="power-button" tooltipText="Lock Screen" onClicked={() => {
                app.toggle_window(modulesRightWindowName);
                lockScreen.show();
            }} />
            <button label="" cssName="power-button" tooltipText="Power Options" onClicked={() => {
                app.toggle_window(modulesRightWindowName);
                powerOptionsWindow.show();
            }} />
        </box>
    );
}