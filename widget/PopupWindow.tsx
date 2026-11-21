import Gtk from "gi://Gtk?version=4.0";
import Gdk from "gi://Gdk?version=4.0";
import { Astal } from "ags/gtk4";
import AstalNiri from "gi://AstalNiri";
import GObject from "gnim/gobject";
import app from "ags/gtk4/app";
import { TimerManager } from "../TimerManager";

export default GObject.registerClass(
  {
    GTypeName: "PopupWindow",
  },
  class PopupWindow extends Astal.Window {
    private revealer: Gtk.Revealer;
    private readonly timers = new TimerManager();
    private openState = false;
    private readonly niri = AstalNiri.get_default();
    private suppressFocusClose = false;

    constructor(props: any & { child: Gtk.Widget }) {
      const { name, child, ...rest } = props;

      super({
        ...rest,
        name,
        layer: Astal.Layer.OVERLAY,
        visible: false,
        keymode: Astal.Keymode.ON_DEMAND,
        cssName: "popup-window-style",
        vexpand: false,
        valign: Gtk.Align.START,
        application: app,
      });

      const revealer = new Gtk.Revealer({
        child,
        transition_type: Gtk.RevealerTransitionType.SLIDE_DOWN,
        transition_duration: 100,
        reveal_child: false,
      });

      this.revealer = revealer;
      this.set_child(revealer);

      const keyController = new Gtk.EventControllerKey();
      keyController.connect("key-pressed", (_, keyval) => {
        if (keyval === Gdk.KEY_Escape) {
          this.hide_all();
          return true;
        }
        return false;
      });
      this.add_controller(keyController);

      this.niri.connect("overview-opened-or-closed", () => {
        this.hide_all();
      });

      this.niri.connect("window-focus-changed", (_niri, windowId: number) => {
        if (!this.openState || this.suppressFocusClose) return;
        if (windowId > 0) {
          this.hide_all();
        }
      });
    }

    hide_others() {
      app.get_windows().forEach((window) => {
        if (window !== this && window.name !== "bar-background") {
          const popup = window as typeof window & { hide_all?: () => void };
          if (typeof popup.hide_all === "function") {
            popup.hide_all();
          } else {
            window.hide();
          }
        }
      });
    }

    hide_all() {
      this.openState = false;
      this.suppressFocusClose = false;
      this.timers.clear();
      this.revealer.reveal_child = false;
      this.set_visible(false);
    }

    isOpen() {
      return this.openState;
    }

    forceOpen() {
      this.openState = true;
      this.timers.clear();
      this.suppressFocusClose = true;
      this.timers.once(500, () => {
        this.suppressFocusClose = false;
      });
      this.set_visible(true);
      this.hide_others();
      this.revealer.reveal_child = true;
    }

    toggle() {
      if (this.isOpen()) {
        this.hide_all();
        return;
      }

      this.forceOpen();
    }
  }
);
