import GObject from "gi://GObject";
import { execAsync } from "ags/process";
import GLib from "gi://GLib";
import Config from "../conf/Config";
import { TimerManager } from "../TimerManager";

const WeatherServiceProperties = {
    'temperature': GObject.ParamSpec.string('temperature', 'Temperature', 'Temperature', GObject.ParamFlags.READWRITE, '?'),
    'temperature-low': GObject.ParamSpec.string('temperature-low', 'Temperature-Low', 'Temperature-Low', GObject.ParamFlags.READWRITE, '?'),
    'temperature-high': GObject.ParamSpec.string('temperature-high', 'Temperature-High', 'Temperature-High', GObject.ParamFlags.READWRITE, '?'),
    'humidity': GObject.ParamSpec.string('humidity', 'humidity', 'humidity', GObject.ParamFlags.READWRITE, '?'),
    'wind-speed': GObject.ParamSpec.string('wind-speed', 'Wind-Speed', 'Wind-Speed', GObject.ParamFlags.READWRITE, '?'),
    'wind-direction': GObject.ParamSpec.string('wind-direction', 'Wind-Direction', 'Wind-Direction', GObject.ParamFlags.READWRITE, '?'),
    'description': GObject.ParamSpec.string('description', 'Description', 'Description', GObject.ParamFlags.READWRITE, ' '),
    'icon': GObject.ParamSpec.string('icon', 'Icon', 'Icon', GObject.ParamFlags.READWRITE, '?'),
    'city': GObject.ParamSpec.string('city', 'city', 'city', GObject.ParamFlags.READWRITE, '?')
};

const updateTimer = 20 * 60 * 1000;

interface OpenWeatherResponse {
    cod: number | string;
    message?: string;
    name?: string;
    main: { temp: number; temp_min: number; temp_max: number; humidity: number };
    wind: { speed: number; deg: number };
    weather: Array<{ description: string; icon: string }>;
}

class InternalWeatherService extends GObject.Object {
    static instance: InternalWeatherService;
    static get_default() {
        if (!this.instance) this.instance = new InternalWeatherService();
        return this.instance;
    }

    api_key = '';
    city_id = '';
    units = '';

    temperature = '?';
    temperature_low = '?';
    temperature_high = '?';
    humidity = '?';
    wind_speed = '?';
    wind_direction = '?';
    description = '?';
    icon = '?';
    city = '?';

    private fetchInProgress: Promise<void> | null = null;
    private readonly timers = new TimerManager();

    constructor() {
        super();
        this.api_key = Config.GetOpenWeatherAPIKey();
        this.city_id = Config.GetOpenWeatherCityCode();
        this.units = Config.GetMeasurementUnits();
        void this.fetchWeather();

        this.timers.repeat(updateTimer, () => {
            void this.fetchWeather();
            return true;
        });
    }

    private fetchWeather(): Promise<void> {
        if (this.fetchInProgress) return this.fetchInProgress;

        this.fetchInProgress = this.performFetch();
        return this.fetchInProgress.finally(() => {
            this.fetchInProgress = null;
        });
    }

    private async performFetch(): Promise<void> {
        if (this.api_key === "") {
            this.description = "Missing API Key";
            this.notify("description");
            return;
        }

        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?id=${encodeURIComponent(this.city_id)}&units=${encodeURIComponent(this.units)}&appid=${encodeURIComponent(this.api_key)}`;
            const response = await execAsync(["curl", "-s", url]);
            const data = JSON.parse(response) as OpenWeatherResponse;

            if (Number(data.cod) !== 200) throw new Error(data.message || "API Error");

            const unitSymbol = this.units === "metric" ? " °C" : " °F";
            const speedSymbol = " mph";

            this.temperature = `${Math.round(data.main.temp)}${unitSymbol}`;
            this.temperature_low = `${Math.round(data.main.temp_min)}${unitSymbol}`;
            this.temperature_high = `${Math.round(data.main.temp_max)}${unitSymbol}`;
            this.humidity = `${Math.round(data.main.humidity)} %`;
            this.wind_speed = data.wind.speed + speedSymbol;
            this.wind_direction = this.getCompassDirection(data.wind.deg);

            const desc = data.weather[0].description;
            this.description = desc.charAt(0).toUpperCase() + desc.slice(1);
            this.icon = this.mapOpenWeatherIcon(data.weather[0].icon);
            this.city = data.name ?? "?";
        } catch (error) {
            console.error(`[OpenWeatherService] Error: ${error}`);
            this.temperature = "?";
            this.temperature_low = "?";
            this.temperature_high = "?";
            this.humidity = "?";
            this.wind_speed = "?";
            this.wind_direction = "?";
            this.description = "?";
            this.icon = "?";
            this.city = "?";
        } finally {
            for (const property of ["temperature", "temperature-low", "temperature-high", "humidity", "wind-speed", "wind-direction", "description", "icon", "city"] as const) {
                this.notify(property);
            }
        }
    }

    private getCompassDirection(degrees: number): string {
        const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        const normalizedDegrees = ((degrees % 360) + 360) % 360;
        const index = Math.round(normalizedDegrees / 22.5) % 16;
        return directions[index];
    }

    private mapOpenWeatherIcon(iconCode: string): string {
        const iconMap: Record<string, string> = {
            "01d": "☀️", "01n": "🌙", "02d": "⛅", "02n": "☁️",
            "03d": "☁️", "03n": "☁️", "04d": "☁️", "04n": "☁️",
            "09d": "🌧️", "09n": "🌧️", "10d": "🌦️", "10n": "🌧️",
            "11d": "⛈️", "11n": "⛈️", "13d": "❄️", "13n": "❄️",
            "50d": "🌫️", "50n": "🌫️",
        };
        return iconMap[iconCode] || "✨";
    }
}

export default GObject.registerClass({ Properties: WeatherServiceProperties }, InternalWeatherService) as unknown as typeof InternalWeatherService;