import AstalCava from "gi://AstalCava";
import { createState, onCleanup } from "ags";
import { TimerManager } from "../../TimerManager";

const blocks = [
  "\u2581",
  "\u2582",
  "\u2583",
  "\u2584",
  "\u2585",
  "\u2586",
  "\u2587",
  "\u2588",
];

const checkTimer = 10 * 1000;
const CAVA_BARS = 30;
const FPS = 60;

export const CavaWidget = () => {
  const cava = AstalCava.get_default()!;

  cava.set_framerate(FPS);
  cava.set_bars(CAVA_BARS);

  const [visible, setVisible] = createState(false);
  const [visuals, setVisuals] = createState("");

  let isMusicPlaying = !(cava.bars === 0 || cava.values.length === 0 || cava.values.every((v) => v < 0.001));
  let lastVisuals = "";
  const timers = new TimerManager();

  timers.repeat(checkTimer, () => {
    isMusicPlaying = !(cava.bars === 0 || cava.values.length === 0 || cava.values.every((v) => v < 0.001));
    return true;
  });

  cava.connect("notify::values", ({ values }) => {
    if (isMusicPlaying) {
      setVisible(true);
      const nextVisuals = values
        .map((val) => blocks[Math.min(Math.floor(val * 32), blocks.length - 1)])
        .join("");

      if (nextVisuals !== lastVisuals) {
        lastVisuals = nextVisuals;
        setVisuals(nextVisuals);
      }
    } else {
      setVisible(false);
      if (lastVisuals !== "") {
        lastVisuals = "";
        setVisuals("");
      }
    }
  });

  onCleanup(() => timers.clear());

  return (
    <box cssName={"cava"} visible={visible}>
      <label label={visuals} />
    </box>
  );
};