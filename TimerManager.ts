import GLib from "gi://GLib";

export class TimerManager {
    private sources = new Set<number>();

    repeat(interval: number, callback: () => boolean): number {
        const source = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
            const result = callback();
            if (!result) this.sources.delete(source);
            return result ? GLib.SOURCE_CONTINUE : GLib.SOURCE_REMOVE;
        });
        this.sources.add(source);
        return source;
    }

    once(interval: number, callback: () => void): number {
        const source = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
            this.sources.delete(source);
            callback();
            return GLib.SOURCE_REMOVE;
        });
        this.sources.add(source);
        return source;
    }

    remove(source: number): void {
        if (!this.sources.delete(source)) return;
        GLib.source_remove(source);
    }

    clear(): void {
        for (const source of this.sources) {
            GLib.source_remove(source);
        }
        this.sources.clear();
    }
}
