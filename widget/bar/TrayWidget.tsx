import Gtk from "gi://Gtk?version=4.0"
import GLib from "gi://GLib?version=2.0"
import Apps from "gi://AstalApps"
import AstalTray from "gi://AstalTray"
import { For, createBinding } from "ags"

const apps = new Apps.Apps()

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function launchMatchingApplication(item: AstalTray.TrayItem) {
  const candidates = [item.title, item.tooltipText, item.id]
    .filter((value): value is string => Boolean(value))
    .map(normalizeName)

  for (const candidate of candidates) {
    if (!candidate) continue

    const app = apps.fuzzy_query(candidate)?.[0]
      || apps.get_list().find((entry) => {
        const name = normalizeName(entry.name)
        const id = normalizeName(entry.entry)
        return name.includes(candidate) || candidate.includes(name) || id.includes(candidate)
      })

    if (app) {
      app.launch()
      return
    }
  }
}

export function TrayWidget() {
  const tray = AstalTray.get_default()
  const items = createBinding(tray, "items")

  const init = (btn: Gtk.Button, item: AstalTray.TrayItem) => {
    if (item.actionGroup) {
      btn.insert_action_group("dbusmenu", item.actionGroup)
    }

    item.connect("notify::action-group", () => {
      if (item.actionGroup) {
        btn.insert_action_group("dbusmenu", item.actionGroup)
      }
    })

    if (item.menuModel) {
      const popover = Gtk.PopoverMenu.new_from_model(item.menuModel)
      popover.set_parent(btn)

      const rightClick = new Gtk.GestureClick({ button: 3 })
      rightClick.connect("released", () => {
        item.about_to_show()
        popover.popup()
      })
      btn.add_controller(rightClick)

      item.connect("notify::menu-model", () => {
        if (item.menuModel) {
          popover.set_menu_model(item.menuModel)
        }
      })
    }

    let clickCount = 0
    let clickTimer: number | null = null

    btn.connect("clicked", () => {
      clickCount++

      if (clickTimer !== null) {
        GLib.source_remove(clickTimer)
        clickTimer = null
      }

      if (clickCount === 2) {
        clickCount = 0
        item.activate(0, 0)
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
          launchMatchingApplication(item)
          return GLib.SOURCE_REMOVE
        })
        return
      }

      clickTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 350, () => {
        clickCount = 0
        clickTimer = null
        return GLib.SOURCE_REMOVE
      })
    })
  }

  return (
    <box
      cssName="tray-module-container"
      orientation={Gtk.Orientation.VERTICAL}
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
      hexpand={false}
      vexpand={false}
      spacing={4}
    >
      <For each={items}>
        {(item) => (
          <button
            $={(self) => init(self, item)}
            tooltipText={item.tooltipText || item.title || item.id}
            cssName="tray-module-button"
          >
            <image gicon={createBinding(item, "gicon")} cssName="tray-module-button-image" />
          </button>
        )}
      </For>
    </box>
  )
}