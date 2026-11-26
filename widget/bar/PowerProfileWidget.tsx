import { Gtk } from "ags/gtk4"
import { onCleanup } from "ags"
import { createBinding, createComputed } from "gnim"
import AstalPowerProfiles from "gi://AstalPowerProfiles"

export function PowerProfileWidget() {
  const powerprofiles = AstalPowerProfiles.get_default()
  const activeProfile = createBinding(powerprofiles, "active_profile")

  const profileLabel = (profile: string) => {
    switch (profile) {
      case "power-saver": return "Power Saver"
      case "balanced": return "Balanced"
      case "performance": return "Performance"
      default:
        return profile
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
    }
  }

  const getIcon = (profile: string) => {
    switch (profile) {
      case "power-saver": return "󰾆"
      case "balanced": return "󰾅"
      case "performance": return "󰓅"
      default: return "󰾆"
    }
  }

  const powerProfileClass = createComputed(() => {
    const profile = activeProfile()
    switch (profile) {
      case "power-saver": return ["power-profile-power-saver"]
      case "balanced": return ["power-profile-balanced"]
      case "performance": return ["power-profile-performance"]
      default: return ["power-profile-unknown"]
    }
  })

  const availableProfiles = powerprofiles.get_profiles()
    .map(({ profile }) => profile)
    .filter((profile, index, profiles) => profiles.indexOf(profile) === index)

  return (
    <box
      $={(self: Gtk.Box) => {
        const popover = new Gtk.Popover({
          has_arrow: true,
          position: Gtk.PositionType.LEFT,
        })
        popover.set_parent(self)

        const profileRows = availableProfiles.map((profile) => (
          <button
            cssName="power-profile-row"
            cssClasses={createComputed(() =>
              activeProfile() === profile
                ? ["power-profile-row", "power-profile-row-active"]
                : ["power-profile-row"]
            )}
            onClicked={() => {
              powerprofiles.set_active_profile(profile)
            }}
          >
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
              <label
                label={getIcon(profile)}
                cssClasses={createComputed(() =>
                  profile === "power-saver" ? ["power-profile-row-icon", "power-profile-row-icon-saver"]
                    : profile === "performance" ? ["power-profile-row-icon", "power-profile-row-icon-performance"]
                      : ["power-profile-row-icon"]
                )}
              />
              <label label={profileLabel(profile)} hexpand xalign={0} cssName="power-profile-row-label" />
              <label
                label={createComputed(() => activeProfile() === profile ? "●" : "")}
                cssName="power-profile-row-check"
              />
            </box>
          </button>
        ))

        const content = (
          <box cssName="power-profile-popover" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
              <label label="Active profile" hexpand xalign={0} cssName="power-profile-detail-label" />
              <label
                label={activeProfile.as(profileLabel)}
                cssName="power-profile-detail-value"
              />
            </box>
            <box cssName="power-profile-divider" />
            {profileRows}
          </box>
        ) as Gtk.Box
        popover.set_child(content)

        const gesture = new Gtk.GestureClick()
        gesture.connect("released", () => popover.popup())
        self.add_controller(gesture)

        onCleanup(() => popover.unparent())
      }}
      cssName="power-profile-button"
      tooltipText={activeProfile.as((profile) => `Power profile: ${profileLabel(profile)}`)}
    >
      <label
        label={activeProfile.as(getIcon)}
        cssClasses={powerProfileClass}
        hexpand
        halign={Gtk.Align.CENTER}
      />
    </box>
  )
}