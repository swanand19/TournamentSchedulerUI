// What Claude Design builds with: the web app's shared pieces and its look, and nothing that talks
// to the API. Screens stay out — they fetch through the encrypted gateway, which only works inside
// the app. Read by the design-sync converter (see NOTES.md); the app itself never imports this.

import "./fonts.css";
import "../src/styles.css";

export { default as Bump } from "../src/Bump.jsx";
export { default as ErrorBanner } from "../src/ErrorBanner.jsx";
export { default as Modal } from "../src/Modal.jsx";
export { ScoringControls } from "../src/ScoringControls.jsx";
export {
  BallIcon,
  CardIcon,
  SwapIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  TimerIcon,
  FlagIcon,
  TargetIcon,
  MissIcon,
  TrophyIcon,
  BanIcon,
} from "../src/icons.jsx";
export { font, footballTheme, cricketTheme, themeFor, SPORTS } from "../src/theme.js";
