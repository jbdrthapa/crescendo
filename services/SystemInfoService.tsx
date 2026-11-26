import GObject from "gi://GObject";
import { execAsync } from "ags/process";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Auth from "gi://AstalAuth"
import { TimerManager } from "../TimerManager";

const SystemInfoServiceProperties = {
    'host-info': GObject.ParamSpec.string(
        'host-info',
        'HostInfo',
        'Host Info',
        GObject.ParamFlags.READWRITE,
        ' '
    ),
    'uptime-info': GObject.ParamSpec.string(
        'uptime-info',
        'UptimeInfo',
        'Uptime Info',
        GObject.ParamFlags.READWRITE,
        ' '
    ),
    'avatar': GObject.ParamSpec.string(
        'avatar',
        'Avatar',
        'Avatar',
        GObject.ParamFlags.READWRITE,
        ' '
    ),
    'auth-message': GObject.ParamSpec.string(
        'auth-message',
        'AuthMessage',
        'Auth Message',
        GObject.ParamFlags.READWRITE,
        ''
    )
};

const hostnameTimer = 1 * 15 * 60 * 1000;       // 15 minutes
const uptimeTimer = 1 * 1 * 60 * 1000;          // 1 minute
const avatarUpdateTimer = 12 * 60 * 60 * 1000   // 12 hours

class InternalSystemInfoService extends GObject.Object {
    static instance: InternalSystemInfoService;
    static get_default() {
        if (!this.instance) this.instance = new InternalSystemInfoService();
        return this.instance;
    }

    host_info = '';
    uptime_info = '';
    avatar = '';
    auth_message = '';
    private readonly timers = new TimerManager();
    private hostnameRefreshInProgress = false;
    private uptimeRefreshInProgress = false;

    constructor() {
        super();

        this.updateHostname();

        this.updateUptime();

        this.updateUserAvatar();

        this.timers.repeat(hostnameTimer, () => {
            this.updateHostname();
            return true;
        });

        this.timers.repeat(uptimeTimer, () => {
            this.updateUptime();
            return true;
        });

        this.timers.repeat(avatarUpdateTimer, () => {
            this.updateUserAvatar();
            return true;
        });
    }

    updateHostname() {
        if (this.hostnameRefreshInProgress) {
            return;
        }
        this.hostnameRefreshInProgress = true;

        execAsync(['hostnamectl', 'hostname']).then((hostname) => {
            this.host_info = hostname;
        }).catch(print).finally(() => {
            this.hostnameRefreshInProgress = false;
        });
    }

    updateUptime() {
        if (this.uptimeRefreshInProgress) {
            return;
        }
        this.uptimeRefreshInProgress = true;

        execAsync(['uptime', '-p']).then((uptime) => {
            this.uptime_info = uptime;
        }).catch(print).finally(() => {
            this.uptimeRefreshInProgress = false;
        });
    }

    updateUserAvatar() {
        const homeDirectory = GLib.get_home_dir();

        const lookupPaths = [
            `${homeDirectory}/.face`,
            `${homeDirectory}/.face.icon`,
            `${homeDirectory}/Pictures/avatar.png`
        ]

        for (const path of lookupPaths) {
            if (Gio.File.new_for_path(path).query_exists(null)) {
                this.avatar = path;
                return;
            }
        }

        this.avatar = "avatar-default";
    }

    authenticate(password: string, onSuccess: () => void) {
        let message = "";
        this.auth_message = "checking ...";
        this.notify("auth-message");
        Auth.Pam.authenticate(password, (_, task) => {
            try {
                Auth.Pam.authenticate_finish(task)
                message = "Authentication Successful";
                this.auth_message = message;
                this.notify("auth-message");

                this.timers.once(800, () => {
                    this.auth_message = "";
                    this.notify("auth-message");
                    onSuccess();
                });


            }
            catch (error) {
                message = "Authentication Failed";
                this.auth_message = message;
                this.notify("auth-message");

                this.timers.once(1000, () => {
                    this.auth_message = "";
                    this.notify("auth-message");
                });
            }
        })
    }
}

export default GObject.registerClass({ Properties: SystemInfoServiceProperties }, InternalSystemInfoService) as unknown as typeof InternalSystemInfoService;