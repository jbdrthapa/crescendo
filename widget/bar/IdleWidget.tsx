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

  const isIdleInhibitedClass = createBinding(idleService, "is_idle_inhibited")((p): string[] => {
    switch (String(p)) {
      case "true":
        return ["is-idle-inhibited"]
      case "false":
      default:
        return ["is-idle-not-inhibited"]
    }
  })

  return (
    <box cssName="graphics-mode-container">
      <label label={isIdleInhibited} tooltipText={isIdleInhibitedTooltip} cssClasses={isIdleInhibitedClass} vexpand valign={Gtk.Align.CENTER} />
    </box>
  )
}