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
    <box spacing={6} cssName="workspace-container" orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.CENTER}>
      <button
        cssClasses={["dock-button", "close"]}
        onClicked={() => execAsync("niri msg action close-window")}
        tooltipText={"Close Active"}
      >
        <label label="󰛉" />
      </button>

      <image
        visible={focused.as(win => !!win)}
        icon-name={focused.as(win => win?.app_id || "image-missing")}
        cssName="active-window-icon"
        tooltipText={focused.as(win => win?.title || "")}
      />

      <button
        cssClasses={["workspace-item", "focus"]}
        onClicked={() => execAsync("niri msg action focus-window-up")}
        tooltipText={"Focus Up"}
      >
        <label label="" />
      </button>

      <box spacing={5} orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.CENTER}>
        <For each={workspaces}>
          {(ws: NiriWorkspace) => (
            <button
              cssClasses={createBinding(niri, "focused_workspace").as(focusedWorkspace => {
                const isFocused = focusedWorkspace?.id === ws.id;
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
        cssClasses={["workspace-item", "focus"]}
        onClicked={() => execAsync("niri msg action focus-window-down")}
        tooltipText={"Focus Down"}
      >
        <label label="" />
      </button>
    </box>
  )
}