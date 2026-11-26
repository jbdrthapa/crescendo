import AstalWp from "gi://AstalWp?version=0.1";
import Gtk from "gi://Gtk?version=4.0";
import { createBinding } from "gnim";
import { SliderAccordionController } from "./SliderAccordionController";
import { execAsync } from "ags/process";
import { TimerManager } from "../../TimerManager";

export function AudioSliderWidget({
    id,
    controller,
    endPoint,
    content
}: {
    id: string;
    controller: SliderAccordionController;
    endPoint: AstalWp.Endpoint;
    content: Gtk.Widget;
}) {

    let soundCooldown = false;
    const timers = new TimerManager();

    function playVolumeSound() {
        if (soundCooldown) return;
        soundCooldown = true;
        execAsync(['canberra-gtk-play', '--id=audio-volume-change'])
            .catch(err => console.error(err))
            .finally(() => {
                timers.once(5, () => {
                    soundCooldown = false;
                });
            });
    }

    function SliderSet({ endpoint }: { endpoint: AstalWp.Endpoint }) {
        const descriptionTooltip = createBinding(endpoint, "description").as(d => d ?? "");
        const description = createBinding(endpoint, "description").as(d => {
            const s = d ?? "";
            return s.length > 40 ? s.slice(0, 37) + "…" : s;
        });

        const volume = createBinding(endpoint, "volume");

        const volumeIcon = volume.as(v => {
            if (id == "speaker") {
                if (v === 0) return "audio-volume-muted-symbolic";
                if (v < 0.33) return "audio-volume-low-symbolic";
                if (v < 0.66) return "audio-volume-medium-symbolic";
                if (v <= 1.0) return "audio-volume-high-symbolic";
                return "audio-volume-overamplified-symbolic";
            }
            else if (id == "microphone") {
                if (v === 0) return "audio-input-microphone-muted-symbolic";
                if (v < 0.33) return "audio-input-microphone-low-symbolic";
                if (v < 0.66) return "audio-input-microphone-low-symbolic";
                if (v <= 1.0) return "audio-input-microphone-high-symbolic";
                return "audio-input-microphone-high-symbolic";
            }
            return "audio-volume-high-symbolic";
        });

        const volumeText = volume.as(v => String(Math.trunc(v * 100)));

        const volumeAdj = new Gtk.Adjustment({
            lower: 0,
            upper: 1.5,
            step_increment: 0.01,
            page_increment: 0.05,
            value: endpoint.volume,
        });

        return (
            <box orientation={Gtk.Orientation.HORIZONTAL} hexpand={true} halign={Gtk.Align.CENTER} heightRequest={80}>
                <image
                    pixelSize={26}
                    iconName={volumeIcon} cssName={"audio-icon"} />
                <label valign={Gtk.Align.CENTER} label={volumeText} cssName={"audio-percent"} />
                <box orientation={Gtk.Orientation.VERTICAL}>
                    <label xalign={0} label={description} tooltipText={descriptionTooltip} cssName="slider-device-name" />
                    <slider
                        adjustment={volumeAdj}
                        cssClasses={["slider-control"]}
                        tooltipText={volumeText}
                        widthRequest={280}
                        onChangeValue={({ value }) => {
                            endpoint.set_volume(value);
                            if (id == "speaker") {
                                playVolumeSound();
                            }
                        }}
                        value={createBinding(endpoint, "volume")} />
                </box>
            </box>
        );
    }

    const revealer = new Gtk.Revealer({
        reveal_child: false,
        transition_type: Gtk.RevealerTransitionType.SLIDE_DOWN,
        transitionDuration: 400
    });

    // Register with controller
    controller.register(id, (openedId) => {
        if (openedId !== id) {
            revealer.set_reveal_child(false);
        }
    });

    const button = (
        <button vexpand={true} valign={Gtk.Align.CENTER} cssName="audio-slider-button">
            <label label="" cssName="slider-content-extender" />
        </button>
    ) as Gtk.Button;


    const sliderWidget = (
        <box>
            <SliderSet endpoint={endPoint} />
            {button}
        </box>
    );

    button.connect("clicked", () => {
        const newState = !revealer.get_reveal_child();
        revealer.set_reveal_child(newState);

        if (newState) {
            controller.open(id);
        }
    });

    revealer.set_child(content);

    return (

        <box orientation={Gtk.Orientation.VERTICAL} cssName="pill-container">
            {sliderWidget}
            {revealer}
        </box>
    );
}
