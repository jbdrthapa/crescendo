import { Gtk } from "ags/gtk4"
import { createBinding, createComputed } from "gnim";
import GraphicsService from "../../services/GraphicsService"

export function GraphicsWidget() {

  const graphicsService = GraphicsService.get_default();

  const rawGraphicsStatusMode = createBinding(graphicsService, "dgpu_mode");

  const graphicsClass = createComputed(() => {
    const state = rawGraphicsStatusMode();
    if (state === "suspended") return ["discrete-graphics-icon-suspended"];
    if (state === "active") return ["discrete-graphics-icon-active"];
    if (state === "resuming") return ["discrete-graphics-icon-resuming"];
    if (state === "suspending") return ["discrete-graphics-icon-suspending"];
    return ["discrete-graphics-icon"];
  });

  return (
    <box cssName="graphics-mode-container">
      <label label="" tooltipText={rawGraphicsStatusMode()} cssClasses={graphicsClass} vexpand valign={Gtk.Align.CENTER} />
    </box>
  )
}