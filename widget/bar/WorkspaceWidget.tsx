import Gtk from "gi://Gtk?version=4.0"
import AstalNiri from "gi://AstalNiri"
import { For, createBinding } from "ags"
import { execAsync } from "ags/process";

interface NiriWorkspace {
  id: number
  name: string | null
  focus(): void
}

export function WorkspaceWidget() {
  const niri = AstalNiri.get_default()

  // 1. Create a binding for the list of all workspaces
  const workspaces = createBinding(niri, "workspaces")

  // 2. Create a binding for the currently focused window object
  const focused = createBinding(niri, "focused_window")

  return (
    <box spacing={10} cssName="workspace-container" orientation={Gtk.Orientation.HORIZONTAL}>
      <button
        vexpand={true}
        valign={Gtk.Align.CENTER}
        cssClasses={["dock-button", "close"]}
        onClicked={() => {
          execAsync("niri msg action close-window")
        }}
        tooltipText={"Close Active"}>
        <label label="󰛉" />
      </button>
      <image
        visible={focused.as(win => !!win)}
        icon-name={focused.as(win => win?.app_id || "image-missing")}
        cssName="active-window-icon"
        tooltipText={focused.as(win => {
          if (!win || !win.title) return "";
          return win.title;
        })}
      />

      <button
        valign={Gtk.Align.CENTER}
        cssClasses={["workspace-item", "focus"]}
        onClicked={() => {
          execAsync("niri msg action focus-column-left")
        }}
        tooltipText={"Focus Left"}
      >
        <label label="" />
      </button>

      <box spacing={7}>

        <For each={workspaces}>
          {(ws: NiriWorkspace) => (
            <button valign={Gtk.Align.CENTER}
              cssClasses={createBinding(niri, "focused_workspace").as(focused => {
                const isFocused = focused?.id === ws.id;
                return isFocused ? ["workspace-item", "focused"] : ["workspace-item"];
              })}
              onClicked={() => ws.focus()}
            >
              <label label={ws.name || `${workspaces.peek().indexOf(ws) + 1}`} />
            </button>
          )}
        </For>
      </box>
      <button
        valign={Gtk.Align.CENTER}
        cssClasses={["workspace-item", "focus"]}
        onClicked={() => {
          execAsync("niri msg action focus-column-right")
        }}
        tooltipText={"Focus Right"}
      >
        <label label="" />
      </button>

    </box>
  )
}