import GObject from "gi://GObject";
import GLib from "gi://GLib";
import { execAsync } from "ags/process";
import { TimerManager } from "../TimerManager";

let dgpuPowerStatusPath: null | string = null;

function readTextFile(path: string): string | null {
    const [success, contents] = GLib.file_get_contents(path);
    if (!success) return null;
    return new TextDecoder().decode(contents).trim();
}

function discoverDgpuPowerStatusPath(): string | null {
    try {
        const devicesDir = GLib.Dir.open("/sys/bus/pci/devices", 0);
        let deviceName: string | null;
        let amdCandidate: string | null = null;

        while ((deviceName = devicesDir.read_name())) {
            const devicePath = `/sys/bus/pci/devices/${deviceName}`;
            const vendor = readTextFile(`${devicePath}/vendor`);
            const statusPath = `${devicePath}/power/runtime_status`;

            if (!GLib.file_test(statusPath, GLib.FileTest.EXISTS)) continue;

            if (vendor === "0x10de") {
                return statusPath;
            }

            if (vendor === "0x1002" || vendor === "0x8086") {
                const bootVga = readTextFile(`${devicePath}/boot_vga`);
                if (bootVga === "0" && amdCandidate === null) {
                    amdCandidate = statusPath;
                }
            }
        }

        return amdCandidate;
    } catch (e) {
        return null;
    }
}

const GraphicsServiceProperties = {
    'dgpu-in-use': GObject.ParamSpec.boolean(
        'dgpu-in-use',
        'DgpuInUse',
        'Discrete GPU Is In Use',
        GObject.ParamFlags.READWRITE,
        false
    ),
    'dgpu-mode': GObject.ParamSpec.string(
        'dgpu-mode',
        'DgpuMode',
        'Discrete GPU Mode',
        GObject.ParamFlags.READWRITE,
        "?"
    ),
    'cardwire-mode': GObject.ParamSpec.string(
        'cardwire-mode',
        'CardwireMode',
        'Cardwire Graphics Mode',
        GObject.ParamFlags.READWRITE,
        "unknown"
    )
};

const checkTimer = 5 * 1000;

class InternalGraphicsService extends GObject.Object {
    static instance: InternalGraphicsService;
    static get_default() {
        if (!this.instance) this.instance = new InternalGraphicsService();
        return this.instance;
    }

    cardwire_mode = "unknown";
    dgpu_in_use = false;
    dgpu_mode = "";
    private refreshInProgress = false;
    private readonly timers = new TimerManager();

    constructor() {
        super();

        let result = this.init();

        result.then((value) => {
            if (!value) {
                return;
            }
        });
    }

    async init() {

        dgpuPowerStatusPath = discoverDgpuPowerStatusPath();

        await this.refreshDGPUPowerStatus();

        this.timers.repeat(checkTimer, () => {
            void this.refreshDGPUPowerStatus();
            return true;
        });

        return true;
    }

    async refreshDGPUPowerStatus() {
        if (this.refreshInProgress) return;
        this.refreshInProgress = true;

        try {
            let cardwireMode = "unknown";
            try {
                const output = await execAsync(["cardwire", "get"]);
                const match = output.match(/Current Mode:\s*([^\s]+)/i);
                if (match) cardwireMode = match[1].toLowerCase();
            } catch (error) {
                cardwireMode = "unknown";
            }

            if (cardwireMode !== this.cardwire_mode) {
                this.cardwire_mode = cardwireMode;
                this.notify("cardwire-mode");
            }

            if (cardwireMode === "integrated") {
                this.updateDgpuMode("suspended");
                return;
            }

            dgpuPowerStatusPath = dgpuPowerStatusPath && GLib.file_test(dgpuPowerStatusPath, GLib.FileTest.EXISTS)
                ? dgpuPowerStatusPath
                : discoverDgpuPowerStatusPath();

            let currentMode = dgpuPowerStatusPath ? readTextFile(dgpuPowerStatusPath) : null;
            if (currentMode === null) {
                currentMode = await this.readRuntimeStatusFallback();
            }

            this.updateDgpuMode(currentMode ?? "unknown");
        } finally {
            this.refreshInProgress = false;
        }
    }

    private updateDgpuMode(currentMode: string) {
        if (currentMode !== this.dgpu_mode) {
            this.dgpu_mode = currentMode;
            this.notify("dgpu-mode");
        }

        const currentDgpuInUse = currentMode !== "suspended" && currentMode !== "unknown";
        if (currentDgpuInUse !== this.dgpu_in_use) {
            this.dgpu_in_use = currentDgpuInUse;
            this.notify("dgpu-in-use");
        }
    }

    async setCardwireMode(mode: "integrated" | "hybrid" | "smart") {
        try {
            await execAsync(["cardwire", "set", mode]);
            await this.refreshDGPUPowerStatus();
            this.timers.once(750, () => {
                void this.refreshDGPUPowerStatus();
            });
        } catch (error) {
            console.error(`Failed to set Cardwire mode to ${mode}:`, error);
        }
    }

    private async readRuntimeStatusFallback(): Promise<string | null> {
        try {
            const output = await execAsync([
                "bash",
                "-lc",
                "for p in /sys/bus/pci/devices/*/power/runtime_status; do v=$(cat \"${p%/power/runtime_status}/vendor\" 2>/dev/null); if [ \"$v\" = \"0x10de\" ]; then cat \"$p\" 2>/dev/null; break; fi; done"
            ]);
            const mode = output.trim();
            return mode || null;
        } catch (error) {
            return null;
        }
    }
}

export default GObject.registerClass({ Properties: GraphicsServiceProperties }, InternalGraphicsService) as unknown as typeof InternalGraphicsService;
