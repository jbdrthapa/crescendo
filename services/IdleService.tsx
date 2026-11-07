import GObject from "gi://GObject";
import { execAsync } from "ags/process";

const IdleServiceProperties = {

};

class InternalIdleService extends GObject.Object {
    static instance: InternalIdleService;
    static get_default() {
        if (!this.instance) this.instance = new InternalIdleService();
        return this.instance;
    }

    private _lockScreenTimeout = "300";    // 5 minutes in milliseconds
    private _displayPowerTimeout = "600"; // 10 minutes in milliseconds

    private _lockScreenCommand = "ags request -i crescendo lock-screen";
    private _displayPowerOffCommand = "niri msg action power-off-monitors";
    private _displayPowerOnCommand = "niri msg action power-on-monitors";

    private _inhibitorProcess: any = null;

    constructor() {
        super();
        this.startIdleProcess();
    }

    private async startIdleProcess() {
        try {
            await execAsync(["pkill", "swayidle"]);
        }
        catch (err) {
            console.error("failed to kill swayidle process.")
        }

        execAsync(["swayidle", "-w", "timeout", this._lockScreenTimeout, this._lockScreenCommand, "timeout", this._displayPowerTimeout, this._displayPowerOffCommand, "resume", this._displayPowerOnCommand, "before-sleep", this._lockScreenCommand])
            .catch(err => console.error("swayidle command failed", err));
    }

    public async enableIdleInhibitor() {
        if (this._inhibitorProcess) {
            console.warn("Idle inhibitor is already active.");
            return;
        }

        try {
            this._inhibitorProcess = await execAsync([
                "systemd-inhibit",
                "--what=idle",
                "--why=crescendo-shell",
                "sleep", "infinity"
            ]);

            console.log("Idle inhibitor enabled (swayidle temporarily disabled).");
        } catch (err) {
            console.error("Failed to start systemd-inhibit:", err);
            this._inhibitorProcess = null;
        }
    }

    public disableIdleInhibitor() {
        if (!this._inhibitorProcess) {
            console.warn("No active idle inhibitor to disable.");
            return;
        }

        try {
            this._inhibitorProcess.kill?.() || execAsync(["kill", this._inhibitorProcess.pid.toString()]);

            console.log("Idle inhibitor disabled (swayidle re-enabled).");

        } catch (err) {

            console.error("Failed to kill systemd-inhibit process:", err);

        } finally {

            this._inhibitorProcess = null;

        }
    }

    public async isIdleInhibited() {
        try {

            const output = await execAsync(["systemd-inhibit", "--list", "--mode=block"]);
            return output.includes("crescendo-shell");

        } catch (err) {

            console.error("Failed to query systemd-inhibit list:", err);
            return false;

        }
    }

}

const IdleService = GObject.registerClass({ Properties: IdleServiceProperties, }, InternalIdleService);

export default IdleService;