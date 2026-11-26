import { Gtk } from "ags/gtk4"
import { onCleanup } from "ags";
import { createBinding, createComputed } from "gnim";
import GraphicsService from "../../services/GraphicsService"

export function GraphicsWidget() {

  const graphicsService = GraphicsService.get_default();

  const rawGraphicsStatusMode = createBinding(graphicsService, "dgpu_mode");
  const cardwireMode = createBinding(graphicsService, "cardwire_mode");

  const graphicsClass = createComputed(() => {
    const state = rawGraphicsStatusMode();
    if (state === "suspended") return ["discrete-graphics-icon-suspended"];
    if (state === "active") return ["discrete-graphics-icon-active"];
    if (state === "resuming") return ["discrete-graphics-icon-resuming"];
    if (state === "suspending") return ["discrete-graphics-icon-suspending"];
    return ["discrete-graphics-icon"];
  });

  const modes = [
    { value: "integrated" as const, label: "Integrated" },
    { value: "hybrid" as const, label: "Hybrid" },
    { value: "smart" as const, label: "Smart" },
  ];

  return (
    <box
      $={(self: Gtk.Box) => {
        const popover = new Gtk.Popover({
          has_arrow: true,
          position: Gtk.PositionType.LEFT,
        });
        popover.set_parent(self);

        const modeRows = modes.map((mode) => (
          <button
            cssName="graphics-mode-row"
            cssClasses={createComputed(() =>
              cardwireMode() === mode.value
                ? ["graphics-mode-row", "graphics-mode-row-active"]
                : ["graphics-mode-row"]
            )}
            onClicked={() => {
              void graphicsService.setCardwireMode(mode.value);
            }}
          >
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
              <label label={mode.label} hexpand xalign={0} cssName="graphics-mode-label" />
              <label label={createComputed(() => cardwireMode() === mode.value ? "●" : "")} cssName="graphics-mode-check" />
            </box>
          </button>
        ));

        const content = (
          <box cssName="graphics-popover" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
              <label label="Cardwire mode" hexpand xalign={0} cssName="graphics-detail-label" />
              <label label={cardwireMode} cssName="graphics-detail-value" />
            </box>
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
              <label label="dGPU status" hexpand xalign={0} cssName="graphics-detail-label" />
              <label label={rawGraphicsStatusMode} cssName="graphics-detail-value" />
            </box>
            <box cssName="graphics-mode-divider" />
            {modeRows}
          </box>
        ) as Gtk.Box;
        popover.set_child(content);

        const gesture = new Gtk.GestureClick();
        gesture.connect("released", () => popover.popup());
        self.add_controller(gesture);

        onCleanup(() => popover.unparent());
      }}
      cssName="graphics-mode-container"
    >
      <label label="" tooltipText={createComputed(() => `Cardwire: ${cardwireMode()}\ndGPU: ${rawGraphicsStatusMode()}`)} cssClasses={graphicsClass} hexpand halign={Gtk.Align.CENTER} />
    </box>
  )
}