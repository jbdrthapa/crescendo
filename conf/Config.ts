import GLib from 'gi://GLib';
import Gio from "gi://Gio";
import Utils from "../Utils";

export interface CrescendoConfig {
    open_weather_api_key: string;
    open_weather_city_code: string;
    measurement_units: string;
    dock_launchers: string[];
    wallpaper_path: string;
    wallpaper_fit: string;
}

const defaultConfig: CrescendoConfig = {
    open_weather_api_key: "",
    open_weather_city_code: "",
    measurement_units: "metric",
    dock_launchers: [],
    wallpaper_path: "",
    wallpaper_fit: "fullscreen",
};

let cachedConfig: CrescendoConfig | null = null;
let monitor: Gio.FileMonitor | null = null;
const configListeners = new Set<() => void>();

function normalizeWallpaperPath(path: string): string {
    if (!path) return "";

    let resolved = path;
    if (path === "~") {
        resolved = GLib.get_home_dir();
    } else if (path.startsWith("~/")) {
        resolved = GLib.build_filenamev([GLib.get_home_dir(), path.slice(2)]);
    } else if (!GLib.path_is_absolute(path)) {
        resolved = GLib.build_filenamev([Utils.GetPicturesDirectory(), path]);
    }

    resolved = GLib.canonicalize_filename(resolved, null);
    const picturesDir = GLib.canonicalize_filename(Utils.GetPicturesDirectory(), null);
    const picturesPrefix = `${picturesDir}/`;

    if (resolved.startsWith(picturesPrefix)) {
        return resolved.slice(picturesPrefix.length);
    }

    return resolved;
}

const configPath = GLib.build_filenamev([
    GLib.get_home_dir(),
    ".config",
    "crescendo",
    "conf",
    "crescendo.json",
]);

function resolveWallpaperPath(path: string): string {
    if (!path) return "";

    if (GLib.path_is_absolute(path) || path.startsWith("~/")) {
        return normalizeWallpaperPath(path);
    }

    return normalizeWallpaperPath(path);
}

function loadConfig(): void {
    const [ok, bytes] = GLib.file_get_contents(configPath);
    if (!ok) {
        cachedConfig = { ...defaultConfig, dock_launchers: [] };
        return;
    }

    try {
        const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<CrescendoConfig>;
        cachedConfig = {
            open_weather_api_key:
                typeof parsed.open_weather_api_key === "string" ? parsed.open_weather_api_key : defaultConfig.open_weather_api_key,
            open_weather_city_code:
                typeof parsed.open_weather_city_code === "string" ? parsed.open_weather_city_code : defaultConfig.open_weather_city_code,
            measurement_units:
                typeof parsed.measurement_units === "string" ? parsed.measurement_units : defaultConfig.measurement_units,
            dock_launchers:
                Array.isArray(parsed.dock_launchers) ? parsed.dock_launchers.filter((launcher): launcher is string => typeof launcher === "string") : [],
            wallpaper_path:
                typeof parsed.wallpaper_path === "string" ? resolveWallpaperPath(parsed.wallpaper_path) : defaultConfig.wallpaper_path,
            wallpaper_fit:
                typeof parsed.wallpaper_fit === "string" ? parsed.wallpaper_fit : defaultConfig.wallpaper_fit,
        };
    } catch (error) {
        print(`crescendo config parse error: ${error}`);
        cachedConfig = { ...defaultConfig, dock_launchers: [] };
    }
}

function reloadConfig(): CrescendoConfig | null {
    loadConfig();
    return cachedConfig;
}

function notifyConfigListeners(): void {
    for (const listener of configListeners) {
        listener();
    }
}

function saveConfig(): boolean {
    if (!cachedConfig) return false;

    try {
        const jsonString = JSON.stringify(cachedConfig, null, 4);
        const bytes = new TextEncoder().encode(jsonString);
        const ok = GLib.file_set_contents(configPath, bytes);
        if (ok) notifyConfigListeners();
        return ok;
    } catch (error) {
        print(`crescendo config save error: ${error}`);
        return false;
    }
}

function setupWatcher(): void {
    const file = Gio.File.new_for_path(configPath);

    monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);

    monitor.connect("changed", (_monitor, _file, _otherFile, eventType) => {
        if (eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
            eventType === Gio.FileMonitorEvent.CHANGED ||
            eventType === Gio.FileMonitorEvent.CREATED) {
            loadConfig();
            for (const listener of configListeners) {
                listener();
            }
        }
    });
}

setupWatcher();
loadConfig();

export function GetOpenWeatherAPIKey(): string {
    return cachedConfig?.open_weather_api_key ?? "";
}

export function GetOpenWeatherCityCode(): string {
    return cachedConfig?.open_weather_city_code ?? "";
}

export function GetMeasurementUnits(): string {
    return cachedConfig?.measurement_units ?? defaultConfig.measurement_units;
}

export function GetDockLaunchers(): string[] {
    return cachedConfig?.dock_launchers ?? [];
}

export function GetWallpaperPath(): string {
    const path = cachedConfig?.wallpaper_path ?? "";
    if (!path) return "";

    if (path === "~") return GLib.get_home_dir();
    if (path.startsWith("~/")) {
        return GLib.build_filenamev([GLib.get_home_dir(), path.slice(2)]);
    }
    if (GLib.path_is_absolute(path)) return path;

    return GLib.build_filenamev([Utils.GetPicturesDirectory(), path]);
}

export function GetWallpaperFit(): string {
    return cachedConfig?.wallpaper_fit ?? defaultConfig.wallpaper_fit;
}

export function SetMeasurementUnits(measurementUnits: string): void {
    if (!reloadConfig()) return;

    try {
        cachedConfig!.measurement_units = measurementUnits;
        saveConfig();
    } catch (error) {
        print(`Failed to set measurement units: ${error}`);
    }
}

export function SetWallpaperPath(path: string): void {
    if (!reloadConfig()) return;

    try {
        cachedConfig!.wallpaper_path = normalizeWallpaperPath(path);
        saveConfig();
    } catch (error) {
        print(`Failed to set wallpaper path: ${error}`);
    }
}

export function SetWallpaperFit(fit: string): void {
    if (!reloadConfig()) return;

    try {
        cachedConfig!.wallpaper_fit = fit;
        saveConfig();
    } catch (error) {
        print(`Failed to set wallpaper fit: ${error}`);
    }
}

export function Subscribe(listener: () => void): () => void {
    configListeners.add(listener);
    return () => configListeners.delete(listener);
}

const Config = {
    GetOpenWeatherAPIKey,
    GetOpenWeatherCityCode,
    GetMeasurementUnits,
    GetDockLaunchers,
    GetWallpaperPath,
    GetWallpaperFit,
    SetMeasurementUnits,
    SetWallpaperPath,
    SetWallpaperFit,
    Subscribe,
};

export default Config;