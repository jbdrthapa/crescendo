import Gtk from "gi://Gtk?version=4.0"
import AstalTray from "gi://AstalTray"
import { For, createBinding } from "ags"

export function TrayWidget() {
  const tray = AstalTray.get_default()
  const items = createBinding(tray, "items")

  const init = (btn: Gtk.Button, item: AstalTray.TrayItem) => {
    const popover = Gtk.PopoverMenu.new_from_model(item.menuModel)
    popover.set_parent(btn)

    const gesture = new Gtk.GestureClick({ button: 3 })
    gesture.connect("released", () => {
      popover.popup()
    })
    btn.add_controller(gesture)

    btn.insert_action_group("dbusmenu", item.actionGroup)
    item.connect("notify::action-group", () => {
      btn.insert_action_group("dbusmenu", item.actionGroup)
    })
  }

  return (
    <box cssName="tray-module-container">
      <For each={items}>
        {(item) => (
          <button $={(self) => init(self, item)} cssName="tray-module-button">
            <image gicon={createBinding(item, "gicon")} cssName="tray-module-button-image" />
          </button>
        )}
      </For>
    </box>
  )
}