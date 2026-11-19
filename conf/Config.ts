import GLib from 'gi://GLib';
import Gio from "gi://Gio";

export interface CrescendoConfig {
    open_weather_api_key: string;
    open_weather_city_code: string;
    measurement_units: string;
    dock_launchers: string[];
}

const defaultConfig: CrescendoConfig = {
    open_weather_api_key: "",
    open_weather_city_code: "",
    measurement_units: "metric",
    dock_launchers: [],
};

let cachedConfig: CrescendoConfig | null = null;
let monitor: Gio.FileMonitor | null = null;
const configPath = GLib.build_filenamev([
    GLib.get_home_dir(),
    ".config",
    "crescendo",
    "conf",
    "crescendo.json",
]);

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

function saveConfig(): boolean {
    if (!cachedConfig) return false;

    try {
        const jsonString = JSON.stringify(cachedConfig, null, 4);
        const bytes = new TextEncoder().encode(jsonString);
        const ok = GLib.file_set_contents(configPath, bytes);
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

export function SetMeasurementUnits(measurementUnits: string): void {
    if (!reloadConfig()) return;

    try {
        cachedConfig!.measurement_units = measurementUnits;
        saveConfig();
    } catch (error) {
        print(`Failed to set measurement units: ${error}`);
    }
}

const Config = {
    GetOpenWeatherAPIKey,
    GetOpenWeatherCityCode,
    GetMeasurementUnits,
    GetDockLaunchers,
    SetMeasurementUnits,
};

export default Config;