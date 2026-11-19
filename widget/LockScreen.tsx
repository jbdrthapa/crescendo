import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import app from "ags/gtk4/app";
import { Astal } from "ags/gtk4";
import { WindowName } from "../constants";
import { createBinding, createState } from "gnim";
import SystemInfoService from "../services/SystemInfoService";
import { TimerManager } from "../TimerManager";

export function LockScreen() {
  const systemInfoService = SystemInfoService.get_default();

  const avatarImg = createBinding(systemInfoService, "avatar");
  const hostInfo = createBinding(systemInfoService, "host_info");
  const uptime = createBinding(systemInfoService, "uptime_info");
  const authMessage = createBinding(systemInfoService, "auth_message");

  const dynamicGtkCss = avatarImg.as(path => {
    const finalPath = (path && path.startsWith("/")) ? path : "avatar-default";

    if (finalPath.startsWith("/")) {
      return `
        background-image: url('file://${finalPath}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      `;
    }

    return `
      background-image: icon('${finalPath}');
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
    `;
  });

  const [reveal, setReveal] = createState(true);

  let lockScreenWindow: Astal.Window;
  const timers = new TimerManager();

  function slideDownAndHide() {
    setReveal(false);

    timers.once(800, () => {
      lockScreenWindow.hide();
      setReveal(true);
    });
  }

  const revealerWidget = (
    <revealer
      revealChild={reveal}
      transitionType={Gtk.RevealerTransitionType.FADE_SLIDE_UP}
      transitionDuration={1000}
      vexpand={true}
      hexpand={true}
      cssName="lockscreen-background"
      $={() => {
        timers.once(10, () => setReveal(true));
      }}
    >
      <box
        vexpand={true}
        hexpand={true}
        valign={Gtk.Align.CENTER}
        halign={Gtk.Align.CENTER}
        orientation={Gtk.Orientation.VERTICAL}
        spacing={20}
      >
        <box
          hexpand={true}
          halign={Gtk.Align.CENTER}
          cssName="user-avatar-lockscreen"
          css={dynamicGtkCss}
        />

        <label label={hostInfo} cssName="host-info" />
        <label label={uptime} cssName="uptime-info" />

        <entry
          hexpand={false}
          halign={Gtk.Align.CENTER}
          visibility={false}
          cssName="lockscreen-entry"
          onActivate={(self) => {
            systemInfoService.authenticate(self.text, () => {
              slideDownAndHide();
              self.text = "";
            });
          }}
        />

        <label label={authMessage} cssName="auth-message" />
      </box>
    </revealer>
  );

  lockScreenWindow = (
    <window
      name={WindowName.lockScreen}
      namespace={WindowName.lockScreen}
      keymode={Astal.Keymode.EXCLUSIVE}
      layer={Astal.Layer.OVERLAY}
      visible={false}
      exclusivity={Astal.Exclusivity.IGNORE}
      css={"background: none;"}
      anchor={
        Astal.WindowAnchor.TOP |
        Astal.WindowAnchor.BOTTOM |
        Astal.WindowAnchor.LEFT |
        Astal.WindowAnchor.RIGHT
      }
      application={app}
    >
      {revealerWidget}
    </window>
  ) as Astal.Window;

  return lockScreenWindow;
}
