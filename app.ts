import app from "ags/gtk4/app";
import style from "./styles/main.scss";
import WidgetManager from "./WidgetManager";
import Bar from "./widget/Bar";
import NotificationPopups from "./widget/modules-right/NotificationPopups";
import Osd from "./widget/osd/Osd";

app.set_application_id("org.crescendo");
app.set_version("1.0");

app.start({
  instanceName: "crescendo",
  css: style,
  main() {
    const lockScreen = WidgetManager.InitializeLockScreenWindow();
    app.add_window(lockScreen);

    for (const monitor of app.get_monitors()) {
      const bar = Bar(monitor);
      app.add_window(bar);

      const popups = NotificationPopups(monitor);
      app.add_window(popups);

      const osdWindows = Osd(monitor);
      osdWindows.forEach(win => app.add_window(win));
    }
  },
});