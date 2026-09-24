// Match-event icons for the scoring console.
//
// These replace emoji, which render differently on every OS (Windows draws the football blue),
// can't take the theme's colours and clash with the flat stadium palette. Each icon inherits
// `currentColor` and sits on the text baseline; the cards are the one exception, drawn in the
// colour a referee actually holds up.

function Svg({ size = 16, title, children, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      style={{ verticalAlign: "-0.18em", flexShrink: 0, ...style }}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export function BallIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 5.2l2.1 1.5-.8 2.5H6.7l-.8-2.5z" fill="currentColor" stroke="none" />
      <path d="M8 5.2V1.9M10.1 6.7l3.1-1M9.3 9.2l1.9 2.7M6.7 9.2l-1.9 2.7M5.9 6.7l-3.1-1" />
    </Svg>
  );
}

/** A booking card. `color` is the card itself, so it stays yellow or red whatever the text colour. */
export function CardIcon({ color, ...props }) {
  return (
    <Svg {...props}>
      <rect x="4" y="2" width="8.5" height="12" rx="1.5" fill={color} stroke="none" transform="rotate(8 8 8)" />
    </Svg>
  );
}

export function SwapIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 13V3M2.5 5.5L5 3l2.5 2.5M11 3v10M8.5 10.5L11 13l2.5-2.5" />
    </Svg>
  );
}

export function PlayIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 3.2v9.6L12.5 8z" fill="currentColor" />
    </Svg>
  );
}

export function PauseIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5.5 3.5v9M10.5 3.5v9" strokeWidth="2.2" />
    </Svg>
  );
}

export function StopIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3.75" y="3.75" width="8.5" height="8.5" rx="1" fill="currentColor" />
    </Svg>
  );
}

export function TimerIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="9" r="5.25" />
      <path d="M8 6.5V9l1.75 1.25M6.5 1.75h3" />
    </Svg>
  );
}

export function FlagIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3.5 14.5V2M3.5 2.5h8l-1.75 3 1.75 3h-8" />
    </Svg>
  );
}

export function TargetIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <circle cx="8" cy="8" r="3.25" />
      <circle cx="8" cy="8" r="0.6" fill="currentColor" />
    </Svg>
  );
}

export function MissIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 4l8 8M12 4l-8 8" strokeWidth="2" />
    </Svg>
  );
}

export function TrophyIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4.5 2.5h7v3.25a3.5 3.5 0 0 1-7 0z" />
      <path d="M4.5 3.5H2.75v1A2.25 2.25 0 0 0 5 6.75M11.5 3.5h1.75v1A2.25 2.25 0 0 1 11 6.75M8 9.25v2.5M5.5 13.75h5M6.25 11.75h3.5v2h-3.5z" />
    </Svg>
  );
}

export function BanIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M3.6 3.6l8.8 8.8" />
    </Svg>
  );
}
