import GLib from "gi://GLib"

export function WorldClocks({ time_fmt = "%I:%M %p", date_fmt = "%a, %b %e" } = {}) {
    const worldClocks = [
        "America/Los_Angeles",
        "Asia/Kathmandu",
        "America/New_York"
    ]

    return worldClocks.map(zone => {
        const tz = GLib.TimeZone.new(zone)

        return {
            time: () => GLib.DateTime.new_now(tz).format(time_fmt) || "",
            date: () => GLib.DateTime.new_now(tz).format(date_fmt) || "",
            name: () => GLib.DateTime.new_now(tz).get_timezone_abbreviation() || ""
        }
    })
}