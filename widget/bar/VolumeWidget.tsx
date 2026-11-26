import { Gtk } from "ags/gtk4"
import { onCleanup } from "ags"
import AstalWp from "gi://AstalWp?version=0.1"
import { createBinding, createComputed, For } from "gnim"

function volumeIcon(endpoint: AstalWp.Endpoint, speaker: boolean) {
  const volume = createBinding(endpoint, "volume")
  const mute = createBinding(endpoint, "mute")

  return createComputed(() => {
    if (mute() || volume() === 0) {
      return speaker
        ? "audio-volume-muted-symbolic"
        : "audio-input-microphone-muted-symbolic"
    }
    if (speaker) {
      if (volume() < 0.33) return "audio-volume-low-symbolic"
      if (volume() < 0.66) return "audio-volume-medium-symbolic"
      return volume() <= 1
        ? "audio-volume-high-symbolic"
        : "audio-volume-overamplified-symbolic"
    }
    return "audio-input-microphone-high-symbolic"
  })
}

export function VolumeWidget() {
  const wp = AstalWp.get_default()
  if (!wp) return <box />

  const audio = wp.audio
  const speaker = createBinding(audio, "defaultSpeaker")
  const microphone = createBinding(audio, "defaultMicrophone")
  const speakers = createComputed(() => {
    return [...(createBinding(audio, "speakers")() || [])]
      .sort((a, b) => (a.description || "Unknown Device").localeCompare(b.description || "Unknown Device"))
  })
  const microphones = createComputed(() => {
    return [...(createBinding(audio, "microphones")() || [])]
      .sort((a, b) => (a.description || "Unknown Device").localeCompare(b.description || "Unknown Device"))
  })

  const speakerIcon = createComputed(() => {
    const endpoint = speaker()
    return endpoint ? volumeIcon(endpoint, true)() : "audio-volume-muted-symbolic"
  })

  return (
    <box
      $={(self: Gtk.Box) => {
        const popover = new Gtk.Popover({
          has_arrow: true,
          position: Gtk.PositionType.LEFT,
        })
        popover.set_parent(self)

        const endpointControl = (
          title: string,
          endpointBinding: ReturnType<typeof createBinding<AstalWp.Endpoint>>,
          isSpeaker: boolean,
        ) => {
          const volume = createComputed(() => {
            const endpoint = endpointBinding()
            return endpoint ? createBinding(endpoint, "volume")() : 0
          })
          const muted = createComputed(() => {
            const endpoint = endpointBinding()
            return endpoint ? createBinding(endpoint, "mute")() : true
          })
          const description = createComputed(() => {
            const endpoint = endpointBinding()
            if (!endpoint) return `Unknown ${isSpeaker ? "speaker" : "microphone"}`

            const descriptionBinding = createBinding(endpoint, "description")
            const nameBinding = createBinding(endpoint, "name")
            return descriptionBinding()
              || nameBinding()
              || `Unknown ${isSpeaker ? "speaker" : "microphone"}`
          })
          const icon = createComputed(() => {
            const endpoint = endpointBinding()
            return endpoint ? volumeIcon(endpoint, isSpeaker)() : "audio-volume-muted-symbolic"
          })

          const adjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 1.5,
            step_increment: 0.01,
            page_increment: 0.05,
            value: endpointBinding()?.volume || 0,
          })

          return (
            <box cssName="volume-control-section" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
              <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                <image iconName={icon} pixelSize={18} cssName="volume-control-icon" />
                <label label={title} hexpand xalign={0} cssName="volume-control-title" />
                <label label={volume.as(v => `${Math.round(v * 100)}%`)} cssName="volume-control-percent" />
              </box>
              <label label={description} ellipsize={3} maxWidthChars={34} xalign={0} cssName="volume-device-name" />
              <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                <slider
                  cssClasses={["slider-control"]}
                  adjustment={adjustment}
                  hexpand
                  tooltipText={volume.as(v => `${Math.round(v * 100)}%`)}
                  value={volume}
                  onChangeValue={({ value }) => endpointBinding()?.set_volume(value)}
                />
                <Gtk.Switch
                  active={muted}
                  halign={Gtk.Align.END}
                  valign={Gtk.Align.CENTER}
                  tooltipText={muted.as(v => v ? "Unmute" : "Mute")}
                  onNotifyActive={(self) => {
                    const endpoint = endpointBinding()
                    if (endpoint) endpoint.mute = self.active
                  }}
                />
              </box>
            </box>
          )
        }

        const speakerControl = endpointControl("Speaker", speaker, true)
        const microphoneControl = endpointControl("Microphone", microphone, false)

        const content = (
          <box cssName="volume-popover" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
            {speakerControl}
            <box cssName="volume-popover-divider" />
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
              <label label="Output devices" xalign={0} cssName="volume-section-label" />
              <For each={speakers}>{(endpoint) => (
                <button
                  cssName="volume-device-row"
                  onClicked={() => endpoint.isDefault = true}
                >
                  <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <label label={createBinding(endpoint, "description").as(v => v || (endpoint.name || "Unknown Device"))} hexpand xalign={0} cssName="volume-device-row-name" />
                    <label label={createBinding(endpoint, "isDefault").as(v => v ? "●" : "")} cssName="volume-device-active" />
                  </box>
                </button>
              )}</For>
            </box>
            <box cssName="volume-popover-divider" />
            {microphoneControl}
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
              <label label="Input devices" xalign={0} cssName="volume-section-label" />
              <For each={microphones}>{(endpoint) => (
                <button
                  cssName="volume-device-row"
                  onClicked={() => endpoint.isDefault = true}
                >
                  <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <label label={createBinding(endpoint, "description").as(v => v || (endpoint.name || "Unknown Device"))} hexpand xalign={0} cssName="volume-device-row-name" />
                    <label label={createBinding(endpoint, "isDefault").as(v => v ? "●" : "")} cssName="volume-device-active" />
                  </box>
                </button>
              )}</For>
            </box>
          </box>
        ) as Gtk.Box
        popover.set_child(content)

        const gesture = new Gtk.GestureClick()
        gesture.connect("released", () => popover.popup())
        self.add_controller(gesture)

        onCleanup(() => popover.unparent())
      }}
      cssName="volume-button"
      tooltipText="Audio controls"
    >
      <image
        iconName={speakerIcon}
        pixelSize={20}
        cssName="volume-button-icon"
        hexpand
        halign={Gtk.Align.CENTER}
      />
    </box>
  )
}
