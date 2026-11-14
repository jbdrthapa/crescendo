import GLib from 'gi://GLib';
import { execAsync } from "ags/process";

export function GetHomeDirectory() {
    return GLib.get_home_dir();
}

export function GetUserConfigDirectory() {
    return GLib.get_user_config_dir();
}

export function GetSessionType() {
    return GLib.getenv("XDG_CURRENT_DESKTOP") || "";
}

export function CloseOverview() {
    const desktop = GetSessionType().toLowerCase();

    if (desktop.includes("niri")) {
        execAsync("niri msg action close-overview");
    }
}

export function GetTerminal() {
    const envTerminal = GLib.getenv("TERMINAL")?.trim();

    if (envTerminal) {
        return envTerminal;
    }


    const xdgTerminal = GLib.find_program_in_path("xdg-terminal-exec");
    if (xdgTerminal) {
        return xdgTerminal;
    }

    const candidates = [
        "kitty",
        "ghostty",
        "wezterm",
        "alacritty",
        "foot",
        "gnome-terminal",
        "xfce4-terminal",
        "konsole",
        "xterm",
    ];

    for (const candidate of candidates) {
        const resolved = GLib.find_program_in_path(candidate);
        if (resolved) return resolved;
    }

    return "xterm";
}

const Utils = {
    GetHomeDirectory,
    GetUserConfigDirectory,
    GetSessionType,
    CloseOverview,
    GetTerminal,
};

export default Utils;