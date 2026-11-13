import GObject from "gi://GObject";
import { execAsync } from "ags/process";
import GLib from "gi://GLib";
import Config from "../conf/Config"

const WeatherServiceProperties = {
    'temperature': GObject.ParamSpec.string(
        'temperature',
        'Temperature',
        'Temperature',
        GObject.ParamFlags.READWRITE,
        '?'
    ),
    'temperature-low': GObject.ParamSpec.string(
        'temperature-low',
        'Temperature-Low',
        'Temperature-Low',
        GObject.ParamFlags.READWRITE,
        '?'
    ),
    'temperature-high': GObject.ParamSpec.string(
        'temperature-high',
        'Temperature-High',
        'Temperature-High',
        GObject.ParamFlags.READWRITE,
        '?'
    ),
    'humidity': GObject.ParamSpec.string(
        'humidity',
        'humidity',
        'humidity',
        GObject.ParamFlags.READWRITE,
        '?'
    ),
    'wind-speed': GObject.ParamSpec.string(
        'wind-speed',
        'Wind-Speed',
        'Wind-Speed',
        GObject.ParamFlags.READWRITE,
        '?'
    ),
    'wind-direction': GObject.ParamSpec.string(
        'wind-direction',
        'Wind-Direction',
        'Wind-Direction',
        GObject.ParamFlags.READWRITE,
        '?'
    ),
    'description': GObject.ParamSpec.string(
        'description',
        'Description',
        'Description',
        GObject.ParamFlags.READWRITE,
        ' '
    ),
    'icon': GObject.ParamSpec.string(
        'icon',
        'Icon',
        'Icon',
        GObject.ParamFlags.READWRITE,
        '?'
    ),
    'city': GObject.ParamSpec.string(
        'city',
        'city',
        'city',
        GObject.ParamFlags.READWRITE,
        '?'
    )
};

const updateTimer = 20 * 60 * 1000; // 20 minutes

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
    city = '?'


    constructor() {
        super();

        this.api_key = Config.GetOpenWeatherAPIKey();

        this.city_id = Config.GetOpenWeatherCityCode();

        this.units = Config.GetMeasurementUnits();

        this.fetchWeather();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, updateTimer, () => {
            this.fetchWeather();
            return GLib.SOURCE_CONTINUE;
        });
    }

    private async fetchWeather() {
        if (this.api_key === "") {
            this.description = "Missing API Key";
            this.notify("description");
            return;
        }

        try {
            // Call the OpenWeather Current Weather Data API
            const url = `https://api.openweathermap.org/data/2.5/weather?id=${this.city_id}&units=${this.units}&appid=${this.api_key}`;
            const response = await execAsync(`curl -s "${url}"`);
            const data = JSON.parse(response);

            if (data.cod !== 200) {
                throw new Error(data.message || "API Error");
            }

            // console.log(data);

            const unitSymbol = this.units === "metric" ? " °C" : " °F";
            const speedSymbol = " mph";
            const percentSymbol = " %";
            const degreesSymbol = "°";

            this.temperature = `${Math.round(data.main.temp)}${unitSymbol}`;

            this.temperature_low = `${Math.round(data.main.temp_min)}${unitSymbol}`;

            this.temperature_high = `${Math.round(data.main.temp_max)}${unitSymbol}`;

            this.humidity = `${Math.round(data.main.humidity)}${percentSymbol}`;

            this.wind_speed = data.wind.speed + `${speedSymbol}`;

            const compassDirection = this.getCompassDirection(data.wind.deg);

            this.wind_direction = `${compassDirection}`;

            const desc = data.weather[0].description;
            this.description = desc.charAt(0).toUpperCase() + desc.slice(1);

            this.icon = this.mapOpenWeatherIcon(data.weather[0].icon);

            this.city = data.name;

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
            // Notify GObject that properties changed to rebuild dependencies
            this.notify("temperature");
            this.notify("temperature-low");
            this.notify("temperature-high");
            this.notify("humidity");
            this.notify("wind-speed");
            this.notify("wind-direction");
            this.notify("description");
            this.notify("icon");
            this.notify("city");
        }
    }

    private getCompassDirection(degrees: number): string {
        const directions = [
            "N", "NNE", "NE", "ENE",
            "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW",
            "W", "WNW", "NW", "NNW"
        ];

        // Normalize degrees to 0-359
        const normalizedDegrees = ((degrees % 360) + 360) % 360;

        // Split the circle into 16 sectors (22.5 degrees each)
        const index = Math.round(normalizedDegrees / 22.5) % 16;

        return directions[index];
    }

    // Maps OpenWeather's explicit icon string codes to emojis or Nerd Font glyphs
    private mapOpenWeatherIcon(iconCode: string): string {
        const iconMap: Record<string, string> = {
            "01d": "☀️",  // Clear sky day
            "01n": "🌙",  // Clear sky night
            "02d": "⛅",  // Few clouds day
            "02n": "☁️",  // Few clouds night
            "03d": "☁️",  // Scattered clouds
            "03n": "☁️",
            "04d": "☁️",  // Broken/overcast clouds
            "04n": "☁️",
            "09d": "🌧️",  // Shower rain
            "09n": "🌧️",
            "10d": "🌦️",  // Rain day
            "10n": "🌧️",  // Rain night
            "11d": "⛈️",  // Thunderstorm
            "11n": "⛈️",
            "13d": "❄️",  // Snow
            "13n": "❄️",
            "50d": "🌫️",  // Mist/Fog
            "50n": "🌫️",
        };
        return iconMap[iconCode] || "✨";
    }
}

const WeatherService = GObject.registerClass({ Properties: WeatherServiceProperties, }, InternalWeatherService);

export default WeatherService;