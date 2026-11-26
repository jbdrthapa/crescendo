import GObject from "gi://GObject";
import Config from "../conf/Config";

const WallpaperServiceProperties = {
    wallpaper: GObject.ParamSpec.string(
        "wallpaper",
        "Wallpaper",
        "Wallpaper path",
        GObject.ParamFlags.READWRITE,
        ""
    ),
    "wallpaper-fit": GObject.ParamSpec.string(
        "wallpaper-fit",
        "WallpaperFit",
        "Wallpaper fit mode",
        GObject.ParamFlags.READWRITE,
        "fullscreen"
    ),
};

class InternalWallpaperService extends GObject.Object {
    static instance: InternalWallpaperService;

    static get_default(): InternalWallpaperService {
        if (!this.instance) this.instance = new InternalWallpaperService();
        return this.instance;
    }

    wallpaper = "";
    wallpaper_fit = "fullscreen";

    constructor() {
        super();
        this.syncFromConfig();
        Config.Subscribe(() => this.syncFromConfig());
    }

    private syncFromConfig(): void {
        this.wallpaper = Config.GetWallpaperPath();
        this.wallpaper_fit = Config.GetWallpaperFit();
    }

    setWallpaper(path: string): void {
        Config.SetWallpaperPath(path);
    }

    setFit(fit: string): void {
        Config.SetWallpaperFit(fit);
    }
}

export default GObject.registerClass(
    { Properties: WallpaperServiceProperties },
    InternalWallpaperService
) as unknown as typeof InternalWallpaperService;
