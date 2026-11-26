import GObject from "gi://GObject";
import { execAsync, subprocess } from "ags/process";
import GLib from "gi://GLib";
import { TimerManager } from "../TimerManager";

const IdleServiceProperties = {
    'is-idle-inhibited': GObject.ParamSpec.boolean(
        'is-idle-inhibited',
        'isIdleInhibited',
        'Is Idle Inhibited By Crescendo Shell',
        GObject.ParamFlags.READWRITE,
        false
    ),
};

const checkTimer = 3 * 1000;

class InternalIdleService extends GObject.Object {
    static instance: InternalIdleService;
    static get_default() {
        if (!this.instance) this.instance = new InternalIdleService();
        return this.instance;
    }

    public is_idle_inhibited = false;

    private _lockScreenTimeout = "300";    // 5 minutes in milliseconds
    private _displayPowerTimeout = "600"; // 10 minutes in milliseconds

    private _lockScreenCommand = "ags request -i crescendo lock-screen";
    private _displayPowerOffCommand = "niri msg action power-off-monitors";
    private _displayPowerOnCommand = "niri msg action power-on-monitors";

    private _inhibitorProcess: any = null;
    private readonly timers = new TimerManager();

    private refreshInProgress = false;

    constructor() {
        super();

        this.toggleIdleInhibitor = this.toggleIdleInhibitor.bind(this);

        this.startIdleProcess();

        this.refreshisIdleInhibited();

        this.timers.repeat(checkTimer, () => {
            void this.refreshisIdleInhibited();
            return true;
        });
    }

    private async startIdleProcess() {
        try {
            await execAsync(["bash", "-lc", "pkill -x swayidle || true"]);
            const remains = await execAsync(["bash", "-lc", "pgrep -x swayidle >/dev/null && echo running || echo stopped"]);
            console.log(`swayidle status: ${remains.trim()}`);
        } catch (err) {
            console.error("Failed to stop swayidle:", err);
        }

        execAsync(["swayidle", "-w", "timeout", this._lockScreenTimeout, this._lockScreenCommand, "timeout", this._displayPowerTimeout, this._displayPowerOffCommand, "resume", this._displayPowerOnCommand, "before-sleep", this._lockScreenCommand])
            .catch(err => console.error("swayidle command failed", err));
    }

    public toggleIdleInhibitor() {
        if (!this._inhibitorProcess) {
            this.enableIdleInhibitor();
        }
        else {
            this.disableIdleInhibitor();
        }
    }

    public enableIdleInhibitor() {
        if (this._inhibitorProcess)
            return;

        this._inhibitorProcess = subprocess([
            "systemd-inhibit",
            "--what=idle",
            "--why=crescendo-shell",
            "sleep",
            "infinity",
        ]);

        console.log("Idle inhibitor enabled");
    }

    public disableIdleInhibitor() {
        if (!this._inhibitorProcess)
            return;

        try {
            subprocess([
                "pkill",
                "-f",
                "systemd-inhibit --what=idle --why=crescendo-shell"
            ]);
            this._inhibitorProcess = null;
            console.log("Idle inhibitor processes cleaned up");
        } catch (error) {
            console.error("Failed to clean up stray inhibitors:", error);
        }

        console.log("Idle inhibitor disabled");
    }

    private async refreshisIdleInhibited() {
        if (this.refreshInProgress) {
            return;
        }
        this.refreshInProgress = true;
        try {
            const output = await execAsync(["systemd-inhibit", "--list", "--mode=block"]);
            this.is_idle_inhibited = output.includes("crescendo-shell");
            this.notify("is-idle-inhibited");
        } catch (err) {

            console.error("Failed to query systemd-inhibit list:", err);
            return false;

        } finally {
            this.refreshInProgress = false;
        }
    }

}

const IdleService = GObject.registerClass({ Properties: IdleServiceProperties }, InternalIdleService) as unknown as typeof InternalIdleService;

export default IdleService;