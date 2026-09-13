import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import { For, With, createBinding, createState, createComputed } from "ags";
import AstalMpris from "gi://AstalMpris?version=0.1";
import AstalCava from "gi://AstalCava";


function MediaInfo({ mprisPlayer }: { mprisPlayer: AstalMpris.Player }) {
    const textWidth = 50;
    const title = createBinding(mprisPlayer, "title");

    const titleText = title.as((value) => {
        const text = String(value ?? "");
        return text.length > textWidth ? text.slice(0, textWidth) + "…" : text;
    });

    const artist = createBinding(mprisPlayer, "artist");

    const artistText = artist.as((value) => {
        const text = String(value ?? "");
        return text.length > textWidth ? text.slice(0, textWidth) + "…" : text;
    });

    return (
        <box valign={Gtk.Align.CENTER} halign={Gtk.Align.FILL} orientation={Gtk.Orientation.VERTICAL} cssName={"mpris-media-info"}>
            <label xalign={0} label={titleText} tooltipText={title} cssName={"mpris-title"} />
            <label xalign={0} label={artistText} tooltipText={artist} cssName={"mpris-artist"} />
        </box>
    );
}

function CoverArt({ mprisPlayer }: { mprisPlayer: AstalMpris.Player }) {
    const playingClass = createBinding(mprisPlayer, "playbackStatus").as(s =>
        s === AstalMpris.PlaybackStatus.PLAYING ? "playing" : ""
    );

    const coverArt = createBinding(mprisPlayer, "coverArt");

    return (
        <box
            overflow={Gtk.Overflow.HIDDEN}
            cssName="mpris-cover-art"
            cssClasses={playingClass.as(cls => [cls])}
        >
            <image pixelSize={250} file={coverArt} />
        </box>
    );
}

function Buttons({ mprisPlayer }: { mprisPlayer: AstalMpris.Player }) {
    const canGoPrevious = createBinding(mprisPlayer, "canGoPrevious");
    const canControl = createBinding(mprisPlayer, "canControl");
    const canGoNext = createBinding(mprisPlayer, "canGoNext");
    const playbackStatus = createBinding(mprisPlayer, "playbackStatus")((s) => s === AstalMpris.PlaybackStatus.PLAYING);
    const playbackStatusNot = playbackStatus.as((status) => !status);

    return (
        <box hexpand spacing={10} halign={Gtk.Align.END} valign={Gtk.Align.CENTER}>
            <button onClicked={() => mprisPlayer.previous()} visible={canGoPrevious} cssName="mpris-button">
                <image iconName="media-seek-backward-symbolic" />
            </button>

            <button onClicked={() => mprisPlayer.play_pause()} visible={canControl} cssName="mpris-button">
                <box>
                    <image iconName="media-playback-start-symbolic" visible={playbackStatusNot} />
                    <image iconName="media-playback-pause-symbolic" visible={playbackStatus} />
                </box>
            </button>

            <button onClicked={() => mprisPlayer.next()} visible={canGoNext} cssName="mpris-button">
                <image iconName="media-seek-forward-symbolic" />
            </button>
        </box>
    );
}


export function Players() {
    const mpris = AstalMpris.get_default();
    const players = createBinding(mpris, "players");

    const initialPlayers = mpris.players || [];
    const [activePlayer, setActivePlayer] = createState<AstalMpris.Player | null>(
        initialPlayers.length > 0 ? initialPlayers[0] : null
    );

    players.subscribe(() => {
        const currentPlayers = players() || [];

        if (currentPlayers.length > 0) {
            const currentActive = activePlayer();
            const isCurrentPlaying = currentActive && currentActive.playbackStatus === AstalMpris.PlaybackStatus.PLAYING;

            if (!isCurrentPlaying) {
                const playingPlayer = currentPlayers.find(
                    p => p.playbackStatus === AstalMpris.PlaybackStatus.PLAYING
                );

                if (playingPlayer) {
                    print("Selecting active playing player: " + playingPlayer.identity);
                    setActivePlayer(playingPlayer);
                } else {
                    const running = currentPlayers.some(p => p === currentActive);
                    if (!running) {
                        setActivePlayer(currentPlayers[0]);
                    }
                }
            }
        } else {
            setActivePlayer(null);
        }
    });


    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10} cssName={"players-container"}>

            {/* Top Navigation Row */}
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={10} halign={Gtk.Align.CENTER}>
                <For each={players}>
                    {(player) => {
                        const identity = createBinding(player, "identity");
                        const coverArt = createBinding(player, "coverArt");
                        const isActive = activePlayer((current) => current === player);
                        const isStopped = createBinding(player, "playbackStatus");

                        return (
                            <button
                                overflow={Gtk.Overflow.HIDDEN}
                                onClicked={() => setActivePlayer(player)}
                                cssClasses={createComputed(() => {
                                    const classes = ["player-tab"];

                                    if (isActive()) classes.push("active-player-tab");
                                    if (!isStopped()) classes.push("playing-player-tab");

                                    return classes;
                                })}
                                vexpand={false}
                                hexpand={false}
                                tooltipText={identity}
                            >
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={5}>
                                    <image
                                        pixelSize={48}
                                        file={coverArt}
                                        halign={Gtk.Align.CENTER}
                                        valign={Gtk.Align.CENTER}
                                        hexpand={true}
                                        vexpand={true}
                                    />
                                    <label label={identity} />
                                </box>

                            </button>

                        );
                    }}
                </For>
            </box>

            <box vexpand>
                <With value={activePlayer}>
                    {(player) => {
                        if (!player) {
                            return (
                                <box halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} hexpand vexpand>
                                    <label label="No media players active" />
                                </box>
                            );
                        }

                        return (
                            <box orientation={Gtk.Orientation.VERTICAL}>
                                <box spacing={10} hexpand>
                                    {CoverArt({ mprisPlayer: player })}
                                    {MediaInfo({ mprisPlayer: player })}
                                    {Buttons({ mprisPlayer: player })}
                                </box>

                                <box halign={Gtk.Align.CENTER} spacing={4}>

                                </box>

                            </box>
                        );
                    }}
                </With>
            </box >
        </box >
    );
}
