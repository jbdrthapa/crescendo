import Gtk from "gi://Gtk?version=4.0"
import GLib from "gi://GLib?version=2.0"
import Gio from "gi://Gio"
import { createState, onCleanup, For } from "ags"
import { createComputed } from "gnim"
import { execAsync } from "ags/process"

interface KDEDevice {
  id: string
  name: string
  reachable: boolean
  battery: number | null
  charging: boolean
}

export function KDEConnectWidget() {
  const [devices, setDevices] = createState<KDEDevice[]>([])
  const [visible, setVisible] = createState(true)
  const [serviceAvailable, setServiceAvailable] = createState(true)

  const run = (args: string[]) => execAsync(args).catch((error) => {
    print(`KDE Connect: ${error}`)
  })

  const gdbusProperty = async (objectPath: string, property: string) => {
    try {
      const result = await execAsync([
        "gdbus", "call", "--session",
        "--dest", "org.kde.kdeconnect",
        "--object-path", objectPath,
        "--method", "org.freedesktop.DBus.Properties.Get",
        "org.kde.kdeconnect.device.battery", property,
      ])
      return String(result)
    } catch {
      return ""
    }
  }

  const gdbusPropertyWithInterface = async (objectPath: string, interfaceName: string, property: string) => {
    try {
      const result = await execAsync([
        "gdbus", "call", "--session",
        "--dest", "org.kde.kdeconnect",
        "--object-path", objectPath,
        "--method", "org.freedesktop.DBus.Properties.Get",
        interfaceName, property,
      ])
      return String(result)
    } catch {
      return ""
    }
  }

  const gdbusMethod = async (objectPath: string, interfaceName: string, method: string, args: string[] = []) => {
    try {
      await execAsync([
        "gdbus", "call", "--session",
        "--dest", "org.kde.kdeconnect",
        "--object-path", objectPath,
        "--method", `${interfaceName}.${method}`,
        ...args,
      ])
    } catch (error) {
      print(`KDE Connect ${method} failed: ${error}`)
    }
  }

  const refresh = async () => {
    try {
      const output = await execAsync(["kdeconnect-cli", "-l", "--id-only"])
      const ids = String(output).split(/\s+/).map((id) => id.trim()).filter(Boolean)

      setServiceAvailable(true)
      if (ids.length === 0) {
        setDevices([])
        setVisible(true)
        return
      }

      const next = await Promise.all(ids.map(async (id): Promise<KDEDevice> => {
        let name = id
        let reachable = true
        let battery: number | null = null
        let charging = false

        try {
          const nameText = await gdbusDeviceProperty(id, "name")
          const nameMatch = nameText.match(/['"]([^'"]+)['"]/)
          name = nameMatch?.[1] || id
        } catch {}

        try {
          const reachableText = await gdbusDeviceProperty(id, "isReachable")
          reachable = /true/i.test(reachableText)
        } catch {
          reachable = true
        }

        const batteryPath = `/modules/kdeconnect/devices/${id}/battery`
        const chargeText = await gdbusProperty(batteryPath, "charge")
        battery = readInt(chargeText)

        const chargingText = await gdbusProperty(batteryPath, "isCharging")
        charging = /true/i.test(chargingText)

        return { id, name, reachable, battery, charging }
      }))

      setDevices(next)
      setVisible(true)
    } catch {
      setDevices([])
      setServiceAvailable(false)
      setVisible(true)
    }
  }

  refresh()
  const timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
    refresh()
    return GLib.SOURCE_CONTINUE
  })

  onCleanup(() => GLib.source_remove(timer))

  const hasReachableDevice = () => devices().some((device) => device.reachable)

  const tooltip = () => {
    if (!serviceAvailable()) return "KDE Connect unavailable"
    const list = devices()
    if (!list.length) return "KDE Connect\nNo paired devices"
    return list.map((device) => {
      const battery = device.battery == null ? "Unknown" : `${device.battery}%${device.charging ? " (charging)" : ""}`
      return `${device.name}\nStatus: ${device.reachable ? "Connected" : "Unavailable"}\nBattery: ${battery}`
    }).join("\n\n")
  }

  const openReceivedFiles = () => {
    const downloads = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD)
      || `${GLib.get_home_dir()}/Downloads`
    run(["xdg-open", downloads])
  }

  const shareFile = (device: KDEDevice) => {
    const dialog = new Gtk.FileDialog({ title: `Send file to ${device.name}` })
    dialog.open(null, null, (_dialog, result) => {
      try {
        const file = dialog.open_finish(result)
        const path = file.get_path()
        if (path) {
          run(["kdeconnect-cli", "-d", device.id, "--share", path])
          execAsync([
            "notify-send",
            "KDE Connect — sending file",
            `${GLib.path_get_basename(path)}\nSending to ${device.name}`,
            "--app-name=KDE Connect",
            "--icon=folder-upload",
          ]).catch((error) => print(`KDE Connect notification failed: ${error}`))
        }
      } catch (error) {
        print(`File selection cancelled or failed: ${error}`)
      }
    })
  }

  const deviceRow = (device: KDEDevice) => (
    <box cssName="kdeconnect-device-row" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
        <label label={device.name} cssName="kdeconnect-device-name" hexpand xalign={0} />
        <label
          label={device.battery == null ? "—" : `${device.battery}%${device.charging ? " ⚡" : ""}`}
          cssName="kdeconnect-battery"
        />
      </box>
      <label
        label={device.reachable ? "Reachable" : "Unavailable"}
        cssName={device.reachable ? "kdeconnect-status-connected" : "kdeconnect-status-offline"}
        xalign={0}
      />
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={4}>
        <button cssName="kdeconnect-action" tooltipText="Find phone" onClicked={() => run(["kdeconnect-cli", "-d", device.id, "--ring"])}>
          <label label="󰀞" />
        </button>
        <button cssName="kdeconnect-action" tooltipText="Ping phone" onClicked={() => run(["kdeconnect-cli", "-d", device.id, "--ping"])}>
          <label label="󰕧" />
        </button>
        <button cssName="kdeconnect-action" tooltipText="Pair device" onClicked={() => run(["kdeconnect-cli", "-d", device.id, "--pair"])}>
          <label label="󰌿" />
        </button>
        <button cssName="kdeconnect-action" tooltipText="Share clipboard" onClicked={async () => {
          const text = await execAsync(["bash", "-lc", "wl-paste 2>/dev/null || xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null || true"])
          if (String(text).length) run(["kdeconnect-cli", "-d", device.id, "--share-text", String(text).trim()])
        }}>
          <label label="󰆏" />
        </button>
        <button cssName="kdeconnect-action" tooltipText="Open received files" onClicked={() => openReceivedFiles()}>
          <label label="󰈞" />
        </button>
        <button cssName="kdeconnect-action" tooltipText="Send file" onClicked={() => shareFile(device)}>
          <label label="󰈙" />
        </button>
      </box>
    </box>
  )

  let shareSubscription: number | null = null
  let shareConnection: Gio.DBusConnection | null = null

  try {
    shareConnection = Gio.bus_get_sync(Gio.BusType.SESSION, null)
    shareSubscription = shareConnection.signal_subscribe(
      "org.kde.kdeconnect",
      "org.kde.kdeconnect.device.share",
      "shareReceived",
      null,
      null,
      Gio.DBusSignalFlags.NONE,
      (_connection, _sender, objectPath, _interfaceName, _signalName, parameters) => {
        const url = parameters.get_child_value(0).get_string()[0] || ""
        let filePath = url
        if (url.startsWith("file://")) {
          try {
            filePath = GLib.filename_from_uri(url)[0] || url
          } catch {}
        }
        const fileName = GLib.path_get_basename(filePath) || "File"
        const downloads = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD)
          || `${GLib.get_home_dir()}/Downloads`
        const deviceId = objectPath?.split("/")[4] || ""
        const device = devices().find((item) => item.id === deviceId)
        execAsync([
          "notify-send",
          "KDE Connect — file received",
          `${fileName}\nSaved in ${downloads}`,
          "--app-name=KDE Connect",
          "--icon=folder-download",
        ]).catch((error) => print(`KDE Connect notification failed: ${error}`))
      }
    )
  } catch (error) {
    print(`Could not subscribe to KDE Connect file notifications: ${error}`)
  }

  return (
    <box
      $={(self: Gtk.Box) => {
        const popover = new Gtk.Popover({ has_arrow: true, position: Gtk.PositionType.LEFT })
        popover.set_parent(self)

        const content = (
          <box cssName="kdeconnect-popover" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
            <label label="Mobile Connect" cssName="kdeconnect-title" xalign={0} />
            <label
              label="Install KDE Connect: pacman -S kdeconnect"
              cssName="kdeconnect-status-offline"
              xalign={0}
              visible={serviceAvailable.as((available) => !available)}
            />
            <label
              label="No paired devices found"
              cssName="kdeconnect-status-offline"
              xalign={0}
              visible={createComputed(() => serviceAvailable() && devices().length === 0)}
            />
            <box cssName="kdeconnect-device-list" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
              <For each={devices}>{(device) => deviceRow(device)}</For>
            </box>
            <box cssName="kdeconnect-divider" />
            <button cssName="kdeconnect-refresh" onClicked={refresh}>
              <label label="Refresh devices" />
            </button>
          </box>
        ) as Gtk.Box
        popover.set_child(content)

        const gesture = new Gtk.GestureClick()
        gesture.connect("released", () => {
          refresh()
          popover.popup()
        })
        self.add_controller(gesture)

        onCleanup(() => {
          popover.unparent()
          if (shareSubscription && shareConnection) {
            try {
              shareConnection.signal_unsubscribe(shareSubscription)
            } catch (error) {
              print(`Could not unsubscribe from KDE Connect file notifications: ${error}`)
            }
          }
        })
      }}
      cssName="kdeconnect-container"
      halign={Gtk.Align.CENTER}
      hexpand={false}
      tooltipText={createComputed(() => tooltip())}
      visible={visible}
    >
      <label
        label=""
        cssName={createComputed(() => hasReachableDevice() ? "kdeconnect-icon-connected" : "kdeconnect-icon")}
        halign={Gtk.Align.CENTER}
        hexpand={true}
      />
    </box>
  )
}

const readInt = (text: string): number | null => {
  const match = text.match(/(?:^|[^0-9])(-?\d+)(?:[^0-9]|$)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

const gdbusDeviceProperty = async (id: string, property: string) => {
  try {
    const result = await execAsync([
      "gdbus", "call", "--session",
      "--dest", "org.kde.kdeconnect",
      "--object-path", `/modules/kdeconnect/devices/${id}`,
      "--method", "org.freedesktop.DBus.Properties.Get",
      "org.kde.kdeconnect.device", property,
    ])
    return String(result)
  } catch {
    return ""
  }
}
