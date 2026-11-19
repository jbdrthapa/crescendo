import GObject from "gi://GObject";
import { execAsync } from "ags/process";
import GLib from "gi://GLib";
import { TimerManager } from "../TimerManager";

const TimeServiceProperties = {
    'timezone': GObject.ParamSpec.string('timezone', 'Timezone', 'Timezone', GObject.ParamFlags.READWRITE, '?'),
    'time': GObject.ParamSpec.string('time', 'Time', 'Time', GObject.ParamFlags.READWRITE, '?'),
    'date': GObject.ParamSpec.string('date', 'Date', 'Date', GObject.ParamFlags.READWRITE, '?')
};

const delay = (ms: number) => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(null); return GLib.SOURCE_REMOVE; }));
const retryAttempts = 5;
const updateTimeTimer = 60 * 1000;
const updateTimezoneTimer = 20 * 60 * 1000;

class InternalTimeService extends GObject.Object {
    static instance: InternalTimeService;
    static get_default() {
        if (!this.instance) this.instance = new InternalTimeService();
        return this.instance;
    }

    timezone = '';
    time = '';
    date = '';
    private readonly timers = new TimerManager();

    constructor() {
        super();
        this.UpdateTimezone();
        this.RefreshTime();

        this.timers.repeat(updateTimeTimer, () => {
            this.RefreshTime();
            return true;
        });

        this.timers.repeat(updateTimezoneTimer, () => {
            void this.UpdateTimezone();
            return true;
        });
    }

    private RefreshTime(): void {
        try {
            const now = GLib.DateTime.new_now_local();
            this.time = now.format("%I:%M")?.trim() ?? "";
            this.notify("time");

            this.date = now.format("%a, %b %d")?.trim() ?? "";
            this.notify("date");
        } catch {
            print("Unable to refresh local time and date.");
        }
    }

    private async UpdateTimezone(): Promise<void> {
        let timezoneData = null;
        let attempt = 0;
        let retryDelay = 1000;

        while (!timezoneData && attempt < retryAttempts) {
            timezoneData = await this.getTimezone();
            if (!timezoneData) {
                attempt++;
                await delay(retryDelay);
                retryDelay *= 2;
            }
        }

        if (timezoneData) {
            await this.setTimezone(timezoneData.timezone);
            this.timezone = await this.getLocalTimezone() ?? "?";
            this.notify("timezone");
            this.RefreshTime();
        }
    }

    private async getLocalTimezone(): Promise<string | null> {
        try {
            return GLib.DateTime.new_now_local().get_timezone().get_identifier();
        } catch {
            return null;
        }
    }

    private async setTimezone(timezone: string): Promise<void> {
        try {
            const localTimezone = await this.getLocalTimezone();
            if (localTimezone === timezone) return;

            await execAsync(["sudo", "timedatectl", "set-timezone", timezone]);
            await execAsync(["notify-send", "󰾩   Timezone Changed", `Timezone : ${timezone}`, "--hint=string:transient:true"]);
        } catch (error) {
            print(`Unable to set timezone: ${error}`);
        }
    }

    private async getTimezone(): Promise<{ timezone: string; latitude: number; longitude: number } | null> {
        try {
            const jsonStr = await execAsync(["curl", "-s", "https://ipapi.co/json"]);
            const data = JSON.parse(jsonStr);

            if (data.timezone && typeof data.longitude === "number") {
                return { timezone: data.timezone, latitude: data.latitude, longitude: data.longitude };
            }
        } catch (error) {
            print(`Get timezone failed: ${error}`);
        }
        return null;
    }
}

export default GObject.registerClass({ Properties: TimeServiceProperties }, InternalTimeService) as unknown as typeof InternalTimeService;