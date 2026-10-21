/* The live preview's class names (see live.css). */
import "./live.css";
import "./blush.css";

const s = {
  box: "gp-live",
  stage: "gp-live-stage",
  filmDom: "gp-live-film-dom",
  status: "gp-live-status",
  statusHidden: "gp-live-status-hidden",
  error: "gp-live-error",
  bar: "gp-live-bar",
  hint: "gp-live-hint",
  replay: "gp-live-replay",
  blush: "gp-live-blush",
} as const;
export default s;
