import GObject from "gi://GObject";
import GLib from "gi://GLib";

let dgpuPowerStatusPath: null | string = null;

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
    )
};

const checkTimer = 1 * 1000;

class InternalGraphicsService extends GObject.Object {
    static instance: InternalGraphicsService;
    static get_default() {
        if (!this.instance) this.instance = new InternalGraphicsService();
        return this.instance;
    }

    private dgpu_in_use = false;
    private dgpu_mode = "";

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

        dgpuPowerStatusPath = `/sys/bus/pci/devices/0000\:64\:00.0/power/runtime_status`;

        this.refreshDGPUPowerStatus();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, checkTimer, () => {
            this.refreshDGPUPowerStatus();
            return GLib.SOURCE_CONTINUE;
        });

        return true;
    }

    refreshDGPUPowerStatus() {
        try {
            const [success, dgpuPowerStatus] = GLib.file_get_contents(`${dgpuPowerStatusPath}`);
            if (success) {
                let current_mode = new TextDecoder().decode(dgpuPowerStatus).trim();
                if (current_mode !== this.dgpu_mode) {
                    this.dgpu_mode = current_mode;
                    this.notify("dgpu-mode");
                    // console.log("dgpu mode : " + this.dgpu_mode);

                    let current_dgpu_in_use = this.dgpu_mode === "suspended" ? false : true;
                    if (current_dgpu_in_use !== this.dgpu_in_use) {
                        this.dgpu_in_use = current_dgpu_in_use;
                        this.notify("dgpu-in-use");
                        // console.log("dgpu in use : " + this.dgpu_in_use);
                    }
                }
            }
        } catch (e) {
            this.dgpu_in_use = false;
            this.notify("dgpu-in-use");
        }
    }
}

const GraphicsService = GObject.registerClass({ Properties: GraphicsServiceProperties, }, InternalGraphicsService);

export default GraphicsService;
