import { Settings, SettingsWindow } from "./widget/settings/Settings";
import { LockScreen } from "./widget/LockScreen";

let settingsInstance: SettingsWindow | null = null;
let lockScreenInstance: ReturnType<typeof LockScreen> | null = null;

let suppressNextBarClose = false;

export function GetSettingsWindow(): SettingsWindow {
  if (!settingsInstance) {
    settingsInstance = Settings();
  }
  return settingsInstance;
}

export function InitializeLockScreenWindow() {
  if (!lockScreenInstance) {
    lockScreenInstance = LockScreen();
  }
  return lockScreenInstance;
}

export function GetLockScreenWindow() {
  if (!lockScreenInstance) {
    throw new Error("Lock screen window has not been initialized yet.");
  }
  return lockScreenInstance;
}

export function DisposeSettingsWindow() {
  if (settingsInstance) {
    settingsInstance.hide();
    settingsInstance = null;
  }
}

export function SuppressNextBarClose() {
  suppressNextBarClose = true;
}

export function ConsumeNextBarClose(): boolean {
  if (!suppressNextBarClose) return false;
  suppressNextBarClose = false;
  return true;
}

const WidgetManager = {
  GetSettingsWindow,
  GetLockScreenWindow,
  InitializeLockScreenWindow,
  DisposeSettingsWindow,
  SuppressNextBarClose,
  ConsumeNextBarClose,
};

export default WidgetManager;
