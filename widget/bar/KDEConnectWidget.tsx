import Gtk from "gi://Gtk?version=4.0"
import GLib from "gi://GLib?version=2.0"
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

  const readInt = (text: string): number | null => {
    const match = text.match(/(?:^|[^0-9])(-?\d+)(?:[^0-9]|$)/)
    if (!match) return null
    const value = Number(match[1])
    return Number.isFinite(value) ? value : null
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
          const nameOutput = await execAsync(["kdeconnect-cli", "-d", id, "--name"])
          name = String(nameOutput).replace(/^.*?:\s*/, "").trim() || id
        } catch {}

        try {
          const statusOutput = await execAsync(["kdeconnect-cli", "-d", id, "--show-device"])
          const status = String(statusOutput)
          reachable = /reachable|paired/i.test(status) && !/not reachable|is reachable: no/i.test(status)
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

  const firstDevice = () => devices()[0]
  const firstBattery = () => firstDevice()?.battery
  const iconName = () => {
    const value = firstBattery()
    if (value == null) return "phone-symbolic"
    if (value <= 20) return "battery-level-20-symbolic"
    if (value <= 40) return "battery-level-40-symbolic"
    if (value <= 60) return "battery-level-60-symbolic"
    if (value <= 80) return "battery-level-80-symbolic"
    return "battery-level-100-symbolic"
  }

  const tooltip = () => {
    const list = devices()
    if (!list.length) return "No KDE Connect devices"
    return list.map((device) => {
      const battery = device.battery == null ? "Battery unknown" : `${device.battery}%${device.charging ? " • charging" : ""}`
      return `${device.name} — ${device.reachable ? "Connected" : "Unavailable"} — ${battery}`
    }).join("\n")
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
      </box>
    </box>
  )

  return (
    <box
      $={(self: Gtk.Box) => {
        const popover = new Gtk.Popover({ has_arrow: true, position: Gtk.PositionType.LEFT })
        popover.set_parent(self)

        const smsRecipient = new Gtk.Entry({ placeholder_text: "Phone number", hexpand: true })
        const smsMessage = new Gtk.Entry({ placeholder_text: "Message", hexpand: true })
        const sendSms = (device: KDEDevice) => {
          const destination = smsRecipient.text.trim()
          const message = smsMessage.text.trim()
          if (!destination || !message) return
          run(["kdeconnect-cli", "-d", device.id, "--send-sms", "--destination", destination, "--message", message])
          smsMessage.text = ""
        }

        const content = (
          <box cssName="kdeconnect-popover" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
            <label label="KDE Connect" cssName="kdeconnect-title" xalign={0} />
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
            <label label="Send SMS" cssName="kdeconnect-section-label" xalign={0} />
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
              {smsRecipient}
              {smsMessage}
              <button
                cssName="kdeconnect-send-button"
                onClicked={() => {
                  const device = firstDevice()
                  if (device) sendSms(device)
                }}
                sensitive={devices.as((list) => list.some((device) => device.reachable))}
              >
                <label label="Send message" />
              </button>
            </box>
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

        onCleanup(() => popover.unparent())
      }}
      cssName="kdeconnect-container"
      tooltipText={createComputed(() => tooltip())}
      visible={visible}
    >
      <image iconName={createComputed(() => iconName())} cssName="kdeconnect-icon" />
      <label
        label={devices.as((list) => list.length === 1 && list[0].battery != null ? `${list[0].battery}%` : `${list.length}`)}
        cssName="kdeconnect-battery-label"
      />
    </box>
  )
}
