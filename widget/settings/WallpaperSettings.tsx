import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from 'gi://Gio';
import { execAsync } from "ags/process"
import Pango from "gi://Pango";

const WALLPAPER_DIR = `${GLib.get_home_dir()}/Pictures`;
const WALLPAPER_DIR_CACHE = `${WALLPAPER_DIR}/.cache/`;

const thumbToOriginal = new Map<string, string>();

const filenameLengthMax = 40;

function getOriginalFromThumb(thumbPath: string): string | undefined {
    return thumbToOriginal.get(thumbPath);
}

function GetThumbnailFile(image_file: string) {
    const base_file_name = GLib.path_get_basename(image_file);
    const thumbnail_file = WALLPAPER_DIR_CACHE + base_file_name;
    const result = GLib.mkdir_with_parents(WALLPAPER_DIR_CACHE, 0o755);

    if (result !== 0) {
        console.log("Error occurred creating wallpaper thumbnail cache folder.")
    }

    if (!GLib.file_test(thumbnail_file, GLib.FileTest.EXISTS)) {
        console.log("Thumbnail not found: ", thumbnail_file)

        execAsync(`convert "${image_file}" -thumbnail 256x144 "${thumbnail_file}"`)
            .catch(err => printerr(err))

    }

    return thumbnail_file;
}

function SetWallpaper(image: string) {
    execAsync(`awww img --transition-type random --transition-fps 120 --transition-duration 1 "${image}"`);

}

function GetFileMetadata(filePath: string) {
    let metadataText = "";
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
        const formatDescription = Gio.content_type_get_description(contentType);

        metadataText += `<b>Filename:</b> ${filename}\n`;
        metadataText += `<b>Extension:</b> ${extension}\n`;
        metadataText += `<b>Size:</b> ${sizeInBytes} bytes (${humanReadableSize})\n`;
        metadataText += `<b>MIME Type:</b> ${contentType}\n`;
        metadataText += `<b>Description:</b> ${formatDescription}`;

        // console.log(metadataText);

        return metadataText;

    } catch (error) {
        console.error(`Failed to read file info: ${error.message}`);
    }
}

export function WallpaperSettings() {
    const flowbox = new Gtk.FlowBox({
        cssName: "wallpaper-container",
        min_children_per_line: 6,
        max_children_per_line: 6,
        column_spacing: 15,
        row_spacing: 15,
        selection_mode: Gtk.SelectionMode.NONE,
    });


    const files: string[] = [];
    try {
        const dir = GLib.Dir.open(WALLPAPER_DIR, 0);
        let name;
        while ((name = dir.read_name())) {
            if (name.match(/\.(jpg|jpeg|png|webp)$/i)) {
                const image_file = `${WALLPAPER_DIR}/${name}`;
                const thumbnail_file = GetThumbnailFile(image_file);

                thumbToOriginal.set(thumbnail_file, image_file);

                files.push(thumbnail_file);
            }
        }
        dir.close();
    }
    catch (e) {
        console.error("Dir error:", e);
    }

    for (let i = 0; i < files.length; i++) {
        const path = files[i];
        const filename = GLib.path_get_basename(path);
        const metadata = GetFileMetadata(`${WALLPAPER_DIR}/${filename}`);
        const filenameShort =
            filename.length > filenameLengthMax
                ? filename.substring(0, filenameLengthMax) + "..."
                : filename;
        const file = Gio.File.new_for_path(path);
        const image_file = getOriginalFromThumb(path) ?? "";

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
                    cssName={"wallpaper-label"}
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
        buttonGesture.connect("pressed", () => {
            SetWallpaper(image_file);
        });

        child.connect("activate", () => {
            SetWallpaper(image_file);
        });

    }

    return (
        <scrolledwindow
            child={flowbox as any}
        />
    );
}
