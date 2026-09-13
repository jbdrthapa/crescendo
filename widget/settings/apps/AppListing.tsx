import Gtk from "gi://Gtk?version=4.0";
import Apps from "gi://AstalApps";
import { Gdk } from "ags/gtk4";
import { For, createState } from "ags";
import { execAsync, subprocess } from "ags/process";

const terminal = "kitty";
let cached: Gtk.Widget | null = null;

function launch(app?: Apps.Application) {
    if (!app) return;

    // Close the compositor overview
    execAsync("niri msg action close-overview");

    const needsTerminal = app.get_key("Terminal") === "true";

    if (needsTerminal) {
        const cmd = `${terminal} -e ${app.executable}`;
        subprocess(["bash", "-c", `${cmd} >/dev/null 2>&1 &`]);
    } else {
        app.launch();
    }
}

// ---------------------------------------------------------
// App Item Component
// ---------------------------------------------------------
function AppItem({ app }: { app: Apps.Application }) {
    const MAX = 100;
    const cut = (s?: string | null) =>
        s && s.length > MAX ? s.substring(0, MAX) + "..." : s || "";

    const tooltip =
        `<b>Application:</b> ${app.name}` +
        (app.description ? `\n<b>Description:</b> ${app.description}` : "");

    return (
        <button css="background: none;" onClicked={() => launch(app)}>
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={20}
                halign={Gtk.Align.START}
                tooltipMarkup={tooltip}
            >
                <image
                    iconName={app.icon_name || "image-missing"}
                    pixelSize={56}
                    vexpand
                    valign={Gtk.Align.CENTER}
                />

                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    vexpand
                    valign={Gtk.Align.CENTER}
                >
                    <label
                        label={cut(app.name)}
                        cssName="app-name"
                        halign={Gtk.Align.START}
                    />
                    <label
                        label={cut(app.description)}
                        cssName="app-desc"
                        halign={Gtk.Align.START}
                    />
                </box>
            </box>
        </button>
    );
}

// ---------------------------------------------------------
// Main Listing
// ---------------------------------------------------------
export function AppListing() {
    if (cached) return cached;

    let search!: Gtk.Entry;
    let scroll!: Gtk.ScrolledWindow;

    const apps = new Apps.Apps();
    const [list, setList] = createState(apps.fuzzy_query(""));

    const updateSearch = (text: string) =>
        setList(text ? apps.fuzzy_query(text) : apps.fuzzy_query(""));

    // -----------------------------------------------------
    // Keyboard Handler
    // -----------------------------------------------------
    function onKey(
        _ctrl: Gtk.EventControllerKey,
        keyval: number,
        _code: number,
        mod: number,
    ) {
        if (keyval === Gdk.KEY_Escape) {
            cached!.visible = false;
            return true;
        }

        if (mod === Gdk.ModifierType.ALT_MASK) {
            const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            for (const n of nums) {
                if (keyval === Gdk[`KEY_${n}`]) {
                    launch(list.peek()[n - 1]);
                    return true;
                }
            }
        }

        return false;
    }

    // -----------------------------------------------------
    // Search Entry
    // -----------------------------------------------------
    const searchEntry = (
        <entry
            cssName="search-entry"
            placeholderText=""
            $={(ref) => (search = ref)}
            onNotifyText={({ text }) => updateSearch(text)}
            onActivate={() => launch(list.peek()[0])}
        />
    ) as Gtk.Entry;

    // -----------------------------------------------------
    // FlowBox
    // -----------------------------------------------------
    const flow = (
        <Gtk.FlowBox
            vexpand
            hexpand
            selectionMode={Gtk.SelectionMode.SINGLE}
            activate_on_single_click
            columnSpacing={0}
            rowSpacing={10}
            minChildrenPerLine={1}
            maxChildrenPerLine={1}
            homogeneous={false}
            valign={Gtk.Align.START}
            halign={Gtk.Align.START}
            focus_on_click={false}
            onChildActivated={(_, child) => child.child?.activate()}
        >
            <For each={list}>
                {(app) => (
                    <Gtk.FlowBoxChild cssName="app-button" can_focus={false}>
                        <AppItem app={app} />
                    </Gtk.FlowBoxChild>
                )}
            </For>
        </Gtk.FlowBox>
    );

    // -----------------------------------------------------
    // Root Container
    // -----------------------------------------------------
    cached = (
        <box cssName="modules-left-container" orientation={Gtk.Orientation.VERTICAL}>
            {searchEntry}
            <scrolledwindow
                vexpand
                hexpand
                heightRequest={500}
                widthRequest={800}
                $={(ref) => (scroll = ref)}
            >
                {flow}
            </scrolledwindow>
        </box>
    ) as Gtk.Widget;

    // -----------------------------------------------------
    // Key Controller
    // -----------------------------------------------------
    const keyController = new Gtk.EventControllerKey();
    keyController.connect("key-pressed", onKey);
    cached.add_controller(keyController);

    // -----------------------------------------------------
    // Focus on map
    // -----------------------------------------------------
    cached.connect("map", () => {
        search.set_can_focus(true);
        search.grab_focus();
        search.set_text("");
    });

    return cached;
}
