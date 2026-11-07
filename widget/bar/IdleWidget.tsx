import { Gtk } from "ags/gtk4"
import { createBinding, createComputed } from "gnim";
import IdleService from "../../services/IdleService"

export function IdleWidget() {

  const idleService = IdleService.get_default();

  const rawIsIdleInhibited = createBinding(idleService, "is_idle_inhibited");

  const isIdleInhibited = createComputed(() => {
    const state = rawIsIdleInhibited();
    if (state) {
      return "󰔞";
    } else {
      return "󰔛"
    }
  });

  const isIdleInhibitedTooltip = createComputed(() => {
    const state = rawIsIdleInhibited();
    if (state) {
      return "Inhibited";
    } else {
      return "Active"
    }
  });

  return (
    <box cssName="graphics-mode-container">
      <label label={isIdleInhibited} tooltipText={isIdleInhibitedTooltip} vexpand valign={Gtk.Align.CENTER} />
    </box>
  )
}