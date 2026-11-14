import Apps from "gi://AstalApps"
import { subprocess } from "ags/process";
import Config from "../../conf/Config";
import Utils from "../../Utils";

const terminal = Utils.GetTerminal();

const appsService = new Apps.Apps()

const DOCK_LAUNCHERS = Config.GetDockLaunchers();

function launch(app?: Apps.Application) {
    if (!app) return;

    Utils.CloseOverview();

    const needsTerminal = app.get_key("Terminal") === "true";

    if (needsTerminal) {
        const cmd = `${terminal} -e ${app.executable}`;
        subprocess(["bash", "-lc", `${cmd} >/dev/null 2>&1 &`]);
    } else {
        app.launch();
    }
}

export default function Dock() {
    return (
        <box cssName="dock-window">
            {DOCK_LAUNCHERS.map(appName => {
                const app: Apps.Application = appsService.fuzzy_query(appName)?.[0]
                    || appsService.get_list().find(a => a.name.toLowerCase().includes(appName.toLowerCase()))

                if (!app) {

                    return (
                        <button cssName="dock-item dead" tooltipText={`Missing: ${appName}`}>
                            <image iconName="image-missing" pixelSize={22} />
                        </button>
                    )
                }

                return (
                    <button
                        cssName="dock-item"
                        tooltipMarkup={`<b>Application: </b>${app.name}\n<b>Description: </b>${app.description || "Application Launcher"}`}
                        onClicked={() => {
                            Utils.CloseOverview();
                            launch(app);
                        }}>
                        <image iconName={app.icon_name || "application-x-executable"} pixelSize={22} />
                    </button>
                )
            })}
        </box>
    )
}
