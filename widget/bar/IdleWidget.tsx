import { Gtk } from "ags/gtk4"
import { onCleanup } from "ags"
import { createBinding, createComputed } from "gnim"
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
      return "Idle inhibition: Inhibited";
    } else {
      return "Idle inhibition: Active"
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
    <box
      $={(self: Gtk.Box) => {
        const popover = new Gtk.Popover({
          has_arrow: true,
          position: Gtk.PositionType.LEFT,
        });
        popover.set_parent(self);

        const content = (
          <box cssName="idle-inhibitor-popover" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
              <label label="Idle inhibition" hexpand xalign={0} cssName="idle-inhibitor-detail-label" />
              <label
                label={createComputed(() => rawIsIdleInhibited() ? "Inhibited" : "Active")}
                cssName="idle-inhibitor-detail-value"
              />
            </box>
            <box cssName="idle-inhibitor-divider" />

            <button
              cssName="idle-inhibitor-row"
              cssClasses={createComputed(() =>
                rawIsIdleInhibited()
                  ? ["idle-inhibitor-row", "idle-inhibitor-row-active"]
                  : ["idle-inhibitor-row"]
              )}
              onClicked={() => idleService.enableIdleInhibitor()}
            >
              <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                <label label="Enable inhibition" hexpand xalign={0} cssName="idle-inhibitor-row-label" />
                <label
                  label={createComputed(() => rawIsIdleInhibited() ? "●" : "")}
                  cssName="idle-inhibitor-row-check"
                />
              </box>
            </button>

            <button
              cssName="idle-inhibitor-row"
              cssClasses={createComputed(() =>
                !rawIsIdleInhibited()
                  ? ["idle-inhibitor-row", "idle-inhibitor-row-active"]
                  : ["idle-inhibitor-row"]
              )}
              onClicked={() => idleService.disableIdleInhibitor()}
            >
              <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                <label label="Disable inhibition" hexpand xalign={0} cssName="idle-inhibitor-row-label" />
                <label
                  label={createComputed(() => !rawIsIdleInhibited() ? "●" : "")}
                  cssName="idle-inhibitor-row-check"
                />
              </box>
            </button>
          </box>
        ) as Gtk.Box;
        popover.set_child(content);

        const gesture = new Gtk.GestureClick();
        gesture.connect("released", () => popover.popup());
        self.add_controller(gesture);

        onCleanup(() => popover.unparent());
      }}
      cssName="idle-inhibitor-container"
      tooltipText={isIdleInhibitedTooltip}
    >
      <label
        label={isIdleInhibited}
        cssClasses={isIdleInhibitedClass}
        vexpand
        valign={Gtk.Align.CENTER}
        hexpand
        halign={Gtk.Align.CENTER}
      />
    </box>
  )
}