import GObject from "gi://GObject";
import { execAsync } from "ags/process";
import GLib from "gi://GLib";

const TimeServiceProperties = {
    'timezone': GObject.ParamSpec.string(
        'timezone',
        'Timezone',
        'Timezone',
        GObject.ParamFlags.READWRITE,
        '?'
    ),
    'time': GObject.ParamSpec.string(
        'time',
        'Time',
        'Time',
        GObject.ParamFlags.READWRITE,
        '?'
    ),
    'date': GObject.ParamSpec.string(
        'date',
        'Date',
        'Date',
        GObject.ParamFlags.READWRITE,
        '?'
    )
};
const delay = (ms: number) => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(null); return GLib.SOURCE_REMOVE; }));
let retryDelay = 1000; // 2 seconds
const retryAttempts = 5; // 5 attempts
const updateTimeTimer = 1 * 60 * 1000; // 1 minute
const updateTimezoneTimer = 20 * 60 * 1000; // 20 minutes

class InternalTimeService extends GObject.Object {
    static instance: InternalTimeService;
    static get_default() {
        if (!this.instance) this.instance = new InternalTimeService();
        return this.instance;
    }

    timezone = '';
    time = '';
    date = '';

    constructor() {
        super();

        this.UpdateTimezone();
        this.RefreshTime();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, updateTimeTimer, () => {
            this.RefreshTime();
            return GLib.SOURCE_CONTINUE;
        });

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, updateTimezoneTimer, () => {
            this.UpdateTimezone();
            return GLib.SOURCE_CONTINUE;
        });
    }

    private async RefreshTime() {
        try {
            console.debug("Checking local time");

            let hour = await execAsync("bash -c 'date +%I'");
            let minute = await execAsync("bash -c 'date +%M'");
            let ampm = await execAsync("bash -c 'date +%P'");

            let weekday = await execAsync("bash -c 'date +%a'");
            let month = await execAsync("bash -c 'date +%b'");
            let day = await execAsync("bash -c 'date +%d'");

            // this.time = hour + " : " + minute + " " + ampm;
            this.time = hour + ":" + minute;
            this.notify("time");

            this.date = weekday + ", " + month + " " + day;
            this.notify("date");

            console.debug(`Local time received as : ${this.time} ${this.date}`);
        }
        catch {
            console.log("Unable to refresh local time and date.");
        }
    }


    private async UpdateTimezone() {

        let timezoneData = null;
        let attempt = 0;
        while (!timezoneData && attempt < retryAttempts) {
            timezoneData = await this.getTimezone();
            if (!timezoneData) {
                attempt++;
                console.debug("Timezone data retrieve failed, retry attempt: ", attempt);
                await delay(retryDelay);
                retryDelay *= 2;
            }
        }

        if (timezoneData) {

            this.setTimezone(timezoneData?.timezone);

            this.timezone = await this.getLocalTimezone() ?? "?";

            this.notify("timezone");

            this.RefreshTime();
        }
    }

    private async getLocalTimezone() {
        try {
            console.log("Checking local timezone");

            const timeZone = await execAsync("bash -c \"timedatectl status | awk '/Time zone:/ {print \\$3}'\"")

            console.log("Local timezone received as : ", timeZone);

            return timeZone;
        }
        catch {
            console.log("Unable to get local timezone");
        }
    }

    private async setTimezone(timezone: string) {
        try {

            let localTimezone = await this.getLocalTimezone();

            if (localTimezone === timezone) {
                console.log("No update required, timezone is already set correctly.")
                return;
            }

            console.log("Setting timezone as : ", timezone)

            const result = await execAsync(`sudo timedatectl set-timezone ${timezone}`);

            const icon = "󰾩";
            const heading = `${icon}   Timezone Changed`;
            const message = `Timezone : ${timezone}`;
            await execAsync(`notify-send "${heading}" "${message}" --hint=string:transient:true`);

            console.log(`Timezone changed from : ${localTimezone} to : ${timezone}`);
        }
        catch {
            console.log("Unable to set timezone");
        }
    }

    private async getTimezone() {

        try {
            const jsonStr = await execAsync("curl -s https://ipapi.co/json");
            const data = JSON.parse(jsonStr);

            if (data.timezone && data.timezone && data.longitude) {
                return { timezone: data.timezone, latitude: data.latitude, longitude: data.longitude };
            }
        }
        catch (error) {
            console.debug("Get timezone failed. \n" + error);
        }
    }

}


const TimeService = GObject.registerClass({ Properties: TimeServiceProperties, }, InternalTimeService);

export default TimeService;