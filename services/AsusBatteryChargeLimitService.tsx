import GObject from "gi://GObject";
import GLib from "gi://GLib";
import { execAsync } from "ags/process";

const AsusBatteryChargeLimitServiceProperties = {
  "charge-limit": GObject.ParamSpec.int(
    "charge-limit",
    "ChargeLimit",
    "Current ASUS battery charge limit percentage",
    GObject.ParamFlags.READWRITE,
    0,
    100,
    0
  ),
  "is-supported": GObject.ParamSpec.boolean(
    "is-supported",
    "IsSupported",
    "Whether ASUS battery charge limit is supported by the device",
    GObject.ParamFlags.READWRITE,
    false
  ),
};

class InternalAsusBatteryChargeLimitService extends GObject.Object {
  static instance: InternalAsusBatteryChargeLimitService;

  static get_default() {
    if (!this.instance) this.instance = new InternalAsusBatteryChargeLimitService();
    return this.instance;
  }

  private charge_limit = 0;
  private is_supported = false;

  constructor() {
    super();

    this.refreshChargeLimit();

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30 * 1000, () => {
      this.refreshChargeLimit();
      return GLib.SOURCE_CONTINUE;
    });
  }

  public async refreshChargeLimit(): Promise<void> {
    const limit = await this.readChargeLimit();

    if (limit === null) {
      if (this.is_supported) {
        this.is_supported = false;
        this.notify("is-supported");
      }
      return;
    }

    if (!this.is_supported) {
      this.is_supported = true;
      this.notify("is-supported");
    }

    if (this.charge_limit !== limit) {
      this.charge_limit = limit;
      this.notify("charge-limit");
    }
  }

  public async readChargeLimit(): Promise<number | null> {
    try {
      const output = await execAsync(["asusctl", "battery", "info"]);
      const match = /Current battery charge limit:\s*(\d+)/i.exec(output);

      if (!match) {
        return null;
      }

      const parsed = Number.parseInt(match[1], 10);
      return Number.isFinite(parsed) ? parsed : null;
    } catch (error) {
      console.warn("[AsusBatteryChargeLimitService] asusctl battery info unavailable:", error);
      return null;
    }
  }

  public async setChargeLimit(limit: number): Promise<number | null> {
    const value = Math.min(100, Math.max(20, Math.round(limit)));

    try {
      await execAsync(["asusctl", "battery", "limit", String(value)]);
      this.charge_limit = value;
      this.is_supported = true;
      this.notify("charge-limit");
      this.notify("is-supported");
      return value;
    } catch (error) {
      console.error("[AsusBatteryChargeLimitService] Failed to set charge limit:", error);
      return null;
    }
  }
}

const AsusBatteryChargeLimitService = GObject.registerClass(
  { Properties: AsusBatteryChargeLimitServiceProperties },
  InternalAsusBatteryChargeLimitService
);

export default AsusBatteryChargeLimitService;
