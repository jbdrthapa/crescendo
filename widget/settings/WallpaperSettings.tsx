import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from 'gi://Gio';
import { execAsync } from "ags/process";
import Pango from "gi://Pango";

const WALLPAPER_DIR = `${GLib.get_home_dir()}/Pictures`;
const WALLPAPER_DIR_CACHE = `${WALLPAPER_DIR}/.cache/`;

const thumbToOriginal = new Map<string, string>();
const thumbnailQueue: Array<{ source: string; destination: string }> = [];
const thumbnailPending = new Set<string>();
const thumbnailReadyListeners = new Set<(thumbnailPath: string) => void>();
const wallpaperMonitors = new Set<Gio.FileMonitor>();
let thumbnailQueueActive = false;

const filenameLengthMax = 40;

async function processThumbnailQueue(): Promise<void> {
    if (thumbnailQueueActive) return;
    thumbnailQueueActive = true;

    try {
        while (thumbnailQueue.length > 0) {
            const item = thumbnailQueue.shift();
            if (!item) continue;

            try {
                await execAsync(["convert", item.source, "-thumbnail", "256x144", item.destination]);
                if (GLib.file_test(item.destination, GLib.FileTest.EXISTS)) {
                    for (const listener of thumbnailReadyListeners) {
                        listener(item.destination);
                    }
                }
            } catch (error) {
                printerr(error);
            } finally {
                thumbnailPending.delete(item.destination);
            }
        }
    } finally {
        thumbnailQueueActive = false;
    }
}

function getOriginalFromThumb(thumbPath: string): string | undefined {
    return thumbToOriginal.get(thumbPath);
}

function GetThumbnailFile(imageFile: string): string {
    const baseFileName = GLib.path_get_basename(imageFile);
    const thumbnailFile = WALLPAPER_DIR_CACHE + baseFileName;
    GLib.mkdir_with_parents(WALLPAPER_DIR_CACHE, 0o755);

    if (!GLib.file_test(thumbnailFile, GLib.FileTest.EXISTS) &&
        !thumbnailPending.has(thumbnailFile)) {
        thumbnailPending.add(thumbnailFile);
        thumbnailQueue.push({ source: imageFile, destination: thumbnailFile });
        void processThumbnailQueue();
    }

    return thumbnailFile;
}

function SetWallpaper(image: string): void {
    execAsync(["awww", "img", "--transition-type", "random", "--transition-fps", "120", "--transition-duration", "1", image]);
}

function GetFileMetadata(filePath: string): string {
    const filename = GLib.path_get_basename(filePath);
    const dotIndex = filename.lastIndexOf('.');
    const extension = dotIndex !== -1 ? filename.slice(dotIndex + 1) : '';

    const file = Gio.File.new_for_path(filePath);

    try {
        const info = file.query_info(
            'standard::size,standard::content-type,standard::fast-content-type',
            Gio.FileQueryInfoFlags.NONE,
            null
        );

        const sizeInBytes = info.get_size();
        const humanReadableSize = GLib.format_size(sizeInBytes);
        const contentType = info.get_content_type();
        const formatDescription = contentType ? (Gio.content_type_get_description(contentType) ?? "Unknown") : "Unknown";

        return `<b>Filename:</b> ${filename}\n` +
            `<b>Extension:</b> ${extension}\n` +
            `<b>Size:</b> ${sizeInBytes} bytes (${humanReadableSize})\n` +
            `<b>MIME Type:</b> ${contentType}\n` +
            `<b>Description:</b> ${formatDescription}`;
    } catch (error) {
        console.error(`Failed to read file info: ${error instanceof Error ? error.message : String(error)}`);
        return "";
    }
}

export function WallpaperSettings(): Gtk.Widget {
    const flowbox = new Gtk.FlowBox({
        cssName: "wallpaper-container",
        min_children_per_line: 6,
        max_children_per_line: 6,
        column_spacing: 15,
        row_spacing: 15,
        selection_mode: Gtk.SelectionMode.NONE,
    });

    let debounceId = 0;
    let thumbnailRefreshId = 0;
    let thumbnailRefreshAttempts = 0;

    let wallpaperSnapshot = "";

    const getWallpaperNames = (): string[] => {
        const names: string[] = [];
        try {
            const dir = GLib.Dir.open(WALLPAPER_DIR, 0);
            let name;
            while ((name = dir.read_name())) {
                if (name.match(/\.(jpg|jpeg|png|webp)$/i)) {
                    names.push(name);
                }
            }
            dir.close();
        } catch (error) {
            console.error("Dir error:", error);
        }
        names.sort((a, b) => a.localeCompare(b));
        return names;
    };

    const rebuildGrid = (): void => {
        flowbox.remove_all();
        thumbToOriginal.clear();

        let missingThumbnail = false;
        const files: string[] = [];
        const names = getWallpaperNames();

        for (const name of names) {
            const imageFile = `${WALLPAPER_DIR}/${name}`;
            const thumbnailFile = GetThumbnailFile(imageFile);
            if (!GLib.file_test(thumbnailFile, GLib.FileTest.EXISTS)) {
                missingThumbnail = true;
            }
            thumbToOriginal.set(thumbnailFile, imageFile);
            files.push(thumbnailFile);
        }

        if (GLib.file_test(WALLPAPER_DIR_CACHE, GLib.FileTest.IS_DIR)) {
            try {
                const cacheDir = GLib.Dir.open(WALLPAPER_DIR_CACHE, 0);
                let cacheName;
                while ((cacheName = cacheDir.read_name())) {
                    if (!names.includes(cacheName)) {
                        GLib.remove(WALLPAPER_DIR_CACHE + cacheName);
                    }
                }
                cacheDir.close();
            } catch (error) {
                console.error("Wallpaper cache cleanup error:", error);
            }
        }

        for (const path of files) {
            const thumbnailName = GLib.path_get_basename(path);
            const originalFile = getOriginalFromThumb(path) ?? "";
            const metadata = GetFileMetadata(originalFile);
            const filenameShort = thumbnailName.length > filenameLengthMax
                ? thumbnailName.substring(0, filenameLengthMax) + "..."
                : thumbnailName;
            const file = Gio.File.new_for_path(path);

            const tile = (
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    overflow={Gtk.Overflow.HIDDEN}
                    focusable={true}
                    canFocus={true}
                >
                    <Gtk.Picture
                        cssName="wallpaper-image"
                        file={file}
                        hexpand={true}
                        vexpand={true}
                        keepAspectRatio={true}
                        contentFit={Gtk.ContentFit.COVER}
                    />
                    <label
                        cssName="wallpaper-label"
                        label={filenameShort}
                        tooltipMarkup={metadata}
                        wrap={true}
                        wrap_mode={Pango.WrapMode.WORD_CHAR}
                        max_width_chars={20}
                        valign={Gtk.Align.END}
                        halign={Gtk.Align.FILL}
                    />
                </box>
            ) as Gtk.Widget;

            const child = new Gtk.FlowBoxChild({
                cssName: "wallpaper-thumbnail",
                focusable: true,
                canFocus: true,
            });

            child.set_child(tile);
            flowbox.insert(child, -1);

            const buttonGesture = new Gtk.GestureClick();
            child.add_controller(buttonGesture);
            buttonGesture.connect("pressed", () => SetWallpaper(originalFile));
            child.connect("activate", () => SetWallpaper(originalFile));
        }

        // Refresh the FlowBox if thumbnails are still being generated.
        if (missingThumbnail && thumbnailRefreshAttempts < 100) {
            thumbnailRefreshAttempts++;
            if (thumbnailRefreshId !== 0) {
                GLib.source_remove(thumbnailRefreshId);
            }
            thumbnailRefreshId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                thumbnailRefreshId = 0;
                rebuildGrid();
                return GLib.SOURCE_REMOVE;
            });
        } else if (!missingThumbnail) {
            thumbnailRefreshAttempts = 0;
            thumbnailRefreshId = 0;
        }

        wallpaperSnapshot = names.join("\n");
    };

    const onThumbnailReady = (_thumbnailPath: string): void => {
        rebuildGrid();
    };
    thumbnailReadyListeners.add(onThumbnailReady);

    rebuildGrid();

    const wallpaperDirectory = Gio.File.new_for_path(WALLPAPER_DIR);
    const monitor = wallpaperDirectory.monitor_directory(
        Gio.FileMonitorFlags.WATCH_MOVES,
        null
    );

    monitor.connect("changed", (_monitor, changedFile, _otherFile, eventType) => {
        if (eventType === Gio.FileMonitorEvent.CHANGED ||
            eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT) {
            const name = changedFile?.get_basename();
            if (name) {
                GLib.remove(WALLPAPER_DIR_CACHE + name);
            }
        }

        if (debounceId !== 0) {
            GLib.source_remove(debounceId);
        }

        debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
            debounceId = 0;
            rebuildGrid();
            return GLib.SOURCE_REMOVE;
        });
    });

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
        const currentNames = getWallpaperNames();
        const currentSnapshot = currentNames.join("\n");
        if (currentSnapshot !== wallpaperSnapshot) {
            rebuildGrid();
        }
        return GLib.SOURCE_CONTINUE;
    });

    wallpaperMonitors.add(monitor);

    return (
        <scrolledwindow child={flowbox} />
    ) as Gtk.Widget;
}
