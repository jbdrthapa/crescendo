import GObject from "gi://GObject";
import { execAsync } from "ags/process";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Auth from "gi://AstalAuth"

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

    constructor() {
        super();

        this.updateHostname();

        this.updateUptime();

        this.updateUserAvatar();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, hostnameTimer, () => {
            this.updateHostname();
            return GLib.SOURCE_CONTINUE;
        });

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, uptimeTimer, () => {
            this.updateUptime();
            return GLib.SOURCE_CONTINUE;
        });

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, avatarUpdateTimer, () => {
            this.updateUserAvatar();
            return GLib.SOURCE_CONTINUE;
        });
    }

    updateHostname() {
        execAsync(['hostnamectl', 'hostname']).then((hostname) => {
            this.host_info = hostname;
        }).catch(print);
    }

    updateUptime() {
        execAsync(['uptime', '-p']).then((uptime) => {
            this.uptime_info = uptime;
        }).catch(print);
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

                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
                    this.auth_message = "";
                    this.notify("auth-message");

                    onSuccess();

                    return GLib.SOURCE_REMOVE;
                });


            }
            catch (error) {
                message = "Authentication Failed";
                this.auth_message = message;
                this.notify("auth-message");

                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                    this.auth_message = "";
                    this.notify("auth-message");
                    return GLib.SOURCE_REMOVE;
                });
            }
        })
    }
}

const SystemInfoService = GObject.registerClass({ Properties: SystemInfoServiceProperties, }, InternalSystemInfoService);

export default SystemInfoService;