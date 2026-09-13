import GObject from "gi://GObject";
import { execAsync } from "ags/process";
import GLib from "gi://GLib";

let displayDevice: null | string = null;
let devicePath: null | string = null;
const TARGET_OUTPUT = 'output "Samsung Display Corp. ATNA40CU05-0  Unknown"';

const HDR_MIN = 10;
const HDR_LOW = 100;
const HDR = 234;
const HDR_MAX = 584;

const DisplayServiceProperties = {
    'brightness-percent': GObject.ParamSpec.int(
        'brightness-percent',
        'Brightness',
        'Brightness Percent',
        GObject.ParamFlags.READWRITE,
        0,
        100,
        0
    ),
    'brightness-icon': GObject.ParamSpec.string(
        'brightness-icon',
        'Brightness Icon',
        'The Nerd Font character string for the icon',
        GObject.ParamFlags.READWRITE,
        '\u{f0cb5}'
    ),
    'display-mode': GObject.ParamSpec.string(
        'display-mode',
        'Display Mode',
        'Display Mode string',
        GObject.ParamFlags.READWRITE,
        ''
    ),
    'display-device': GObject.ParamSpec.string(
        'display-device',
        'Display Device',
        'Display Device string',
        GObject.ParamFlags.READWRITE,
        ''
    )
};

const checkTimer = 0.25 * 1000;

class InternalDisplayService extends GObject.Object {
    static instance: InternalDisplayService;
    static get_default() {
        if (!this.instance) this.instance = new InternalDisplayService();
        return this.instance;
    }

    private max_brightness_value = 1;
    private last_brightness_percent = 0;
    private brightness_percent = 0;
    private brightness_icon = "\u{f0cb5}";
    private display_device = "";
    private last_display_mode = "";
    private display_mode = "";
    private adjustment_value = 5;

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

        await this.resolveBrtCtlDevice();

        if (!displayDevice) {
            console.log("Brightness control device could not be resolved !!!");
            return false;
        }

        // Cache file mapping paths and max value once to avoid reloading them
        devicePath = `/sys/class/backlight/${displayDevice}`;
        try {
            const [success, maxContent] = GLib.file_get_contents(`${devicePath}/max_brightness`);
            if (success) {
                this.max_brightness_value = Number(new TextDecoder().decode(maxContent).trim());
            }
        } catch (e) {
            print("Failed to read system max_brightness file", e);
        }

        this.updateBrightnessPercent();

        this.updateDisplayMode();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, checkTimer, () => {
            this.updateBrightnessPercent();
            return GLib.SOURCE_CONTINUE;
        });

        return true;
    }

    updateBrightnessPercent() {

        if (!devicePath) return;

        try {
            // Natively read file contents synchronously (extremely low overhead for sysfs files)
            const [success, content] = GLib.file_get_contents(`${devicePath}/brightness`);
            if (!success) return;

            const current = Number(new TextDecoder().decode(content).trim());

            // Exit early before performing any object updates or math equations
            if (this.last_brightness_percent === current) {
                return;
            }
            this.last_brightness_percent = current;

            // Compute values and deploy to proxy getters/setters instantly
            this.brightness_percent = Math.round((current / this.max_brightness_value) * 100);
            this.notify("brightness-percent");
            this.updateBrightnessIcon();
        } catch (err) {
            print("Sysfs read crash: ", err);
        }
    }

    updateDisplayMode() {
        try {
            const configDir = GLib.get_user_config_dir();
            const filePath = `${configDir}/niri/niri.d/output.kdl`;

            const [success, content] = GLib.file_get_contents(filePath);
            if (!success) return;

            const text = new TextDecoder().decode(content);

            const startIndex = text.indexOf(TARGET_OUTPUT);
            if (startIndex === -1) {
                print("Target monitor block not found");
                return;
            }

            // Find block boundaries
            const blockStart = text.indexOf("{", startIndex);
            let depth = 0;
            let blockEnd = -1;

            for (let i = blockStart; i < text.length; i++) {
                if (text[i] === "{") depth++;
                else if (text[i] === "}") depth--;

                if (depth === 0) {
                    blockEnd = i;
                    break;
                }
            }

            const block = text.slice(blockStart, blockEnd + 1);

            const hdrMatch = block.match(/reference-luminance\s+(\d+)/);

            let mode = "SDR";

            if (hdrMatch) {
                const value = Number(hdrMatch[1]);

                const luminanceMap: Record<number, string> = {
                    [HDR_MIN]: "HDR Min",
                    [HDR_LOW]: "HDR Low",
                    [HDR]: "HDR",
                    [HDR_MAX]: "HDR Max",
                };

                mode = luminanceMap[value] ?? "HDR";
            }

            if (this.last_display_mode === mode) return;

            this.last_display_mode = mode;
            this.display_mode = mode;
            this.notify("display-mode");

        } catch (err) {
            print("Unable to resolve display mode:", err);
        }
    }

    updateBrightnessIcon() {

        let icon;

        if (this.brightness_percent < 11) {
            icon = "\u{f06e9}";
        }
        else if (this.brightness_percent < 31) {
            icon = "\u{f1a4e}";
        }
        else if (this.brightness_percent < 61) {
            icon = "\u{f1a52}";
        }
        else if (this.brightness_percent < 86) {
            icon = "\u{f1a56}";
        }
        else {
            icon = "\u{f06e8}";
        }

        this.brightness_icon = icon;

        this.notify("brightness-icon");
    }

    apply_display_mode(mode: string) {
        try {
            const configDir = GLib.get_user_config_dir();
            const filePath = `${configDir}/niri/niri.d/output.kdl`;

            const [success, content] = GLib.file_get_contents(filePath);
            if (!success) {
                print("Failed to read Niri output.kdl");
                return;
            }

            let text = new TextDecoder().decode(content);

            // Find the output block
            const startIndex = text.indexOf(TARGET_OUTPUT);
            if (startIndex === -1) {
                print("Target monitor block not found");
                return;
            }

            // Find the block boundaries { ... }
            const blockStart = text.indexOf("{", startIndex);
            let depth = 0;
            let blockEnd = -1;

            for (let i = blockStart; i < text.length; i++) {
                if (text[i] === "{") depth++;
                else if (text[i] === "}") depth--;

                if (depth === 0) {
                    blockEnd = i;
                    break;
                }
            }

            if (blockEnd === -1) {
                print("Failed to parse monitor block");
                return;
            }

            const block = text.slice(blockStart, blockEnd + 1);

            //
            // 1. Remove ONLY the hdr block inside this monitor block
            //
            let newBlock = block.replace(
                /^\s*hdr\s+mode="on"\s*\{[\s\S]*?\}\s*/m,
                ""
            );

            const luminanceMap: Record<string, number> = {
                "HDR Min": HDR_MIN,
                "HDR Low": HDR_LOW,
                "HDR": HDR,
                "HDR Max": HDR_MAX,
            };

            //
            // 3. Insert HDR block if needed
            //
            if (mode !== "SDR") {
                const luminance = luminanceMap[mode] ?? 84;

                newBlock = newBlock.replace(/\s*}$/, "");

                // Ensure a clean newline before HDR block
                const hdrBlock =
                    `\n    hdr mode="on" {\n` +
                    `        reference-luminance ${luminance}\n` +
                    `    }\n`;

                newBlock += hdrBlock + "}";

            }

            //
            // 4. Replace the old block with the new one
            //
            const updatedText =
                text.slice(0, blockStart) +
                newBlock +
                text.slice(blockEnd + 1);

            //
            // 5. Write back to file
            //
            GLib.file_set_contents(filePath, updatedText);

            //
            // 6. Update internal state
            //
            this.display_mode = mode;
            this.last_display_mode = mode;
            this.notify("display-mode");

            print(`Display mode applied: ${mode}`);
        } catch (err) {
            print("apply_display_mode failed:", err);
        }

        this.updateDisplayMode();
    }


    setBrightnessValue(value: number) {
        const target = Math.round(value);

        execAsync(['brightnessctl', '-d', `${displayDevice}`, 's', `${target}%`])
            .catch(print);
    }

    increaseBrightness() {
        var adjusted_value = this.brightness_percent + this.adjustment_value;
        this.setBrightnessValue(adjusted_value);
    }

    decreaseBrightness() {
        var adjusted_value = this.brightness_percent - this.adjustment_value;
        this.setBrightnessValue(adjusted_value);
    }

    resolveBrtCtlDevice(): Promise<void> {

        return execAsync(['brightnessctl', '-l'])
            .then((output) => {
                const lines = output.split('\n');

                for (const line of lines) {
                    if (line.includes("of class 'backlight'")) {
                        const match = line.match(/'([^']+)'/);

                        if (match) {
                            const deviceName = match[1];

                            if (deviceName.startsWith('amd') || deviceName.startsWith('intel')) {
                                displayDevice = deviceName;
                                break;
                            }
                        }
                    }
                }

                if (!displayDevice) {
                    console.log("No AMD or Intel backlight device found.");
                }

                this.display_device = displayDevice ?? "";
                this.notify("display-device");
            })
            .catch(print);
    }
}

const DisplayService = GObject.registerClass({ Properties: DisplayServiceProperties, }, InternalDisplayService);

export default DisplayService;
