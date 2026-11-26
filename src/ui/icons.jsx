// Line icons for the app's frame (2026-11-26, the canvas's web boards): the top bar, tabs, side
// lists and pads. Stroke in currentColor on a 24 grid, so each takes the colour of the text it sits
// in. Match-event icons (ball, cards, …) stay in ../icons.jsx.

function Icon({ size = 20, width = 1.9, children, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export const BellIcon = (p) => (
  <Icon {...p}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icon>
);
export const SearchIcon = (p) => (
  <Icon size={18} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Icon>
);
export const PlusIcon = (p) => (
  <Icon width={2.2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const ChevronIcon = (p) => (
  <Icon size={18} {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
export const DownIcon = (p) => (
  <Icon size={16} {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);
export const BackIcon = (p) => (
  <Icon size={22} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);
export const BracketIcon = (p) => (
  <Icon {...p}>
    <path d="M4 5h5v4H4M4 15h5v4H4M9 7h3v10H9M12 12h7" />
  </Icon>
);
export const PeopleIcon = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="3" />
    <circle cx="16.5" cy="10" r="2.5" />
    <path d="M3.5 18a5.5 5.5 0 0 1 11 0M14 18a4.5 4.5 0 0 1 7 0" />
  </Icon>
);
export const CalendarIcon = (p) => (
  <Icon size={19} {...p}>
    <rect x="4" y="5" width="16" height="15" rx="3" />
    <path d="M8 3v4M16 3v4M4 10h16" />
  </Icon>
);
export const ListIcon = (p) => (
  <Icon size={19} {...p}>
    <path d="M9 7h11M9 12h11M9 17h11" />
    <circle cx="5" cy="7" r=".8" />
    <circle cx="5" cy="12" r=".8" />
    <circle cx="5" cy="17" r=".8" />
  </Icon>
);
export const RingIcon = (p) => (
  <Icon size={19} {...p}>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 4.5v7.5l5 4" />
  </Icon>
);
export const BarsIcon = (p) => (
  <Icon size={19} {...p}>
    <path d="M6 19V11M12 19V6M18 19v-5" />
  </Icon>
);
export const TeamsIcon = (p) => (
  <Icon size={19} {...p}>
    <circle cx="8" cy="9" r="2.6" />
    <circle cx="16" cy="9" r="2.6" />
    <path d="M3.5 18a4.5 4.5 0 0 1 9 0M11.5 18a4.5 4.5 0 0 1 9 0" />
  </Icon>
);
export const DotsIcon = (p) => (
  <Icon width={1.6} {...p}>
    <circle cx="6" cy="12" r="1.3" />
    <circle cx="12" cy="12" r="1.3" />
    <circle cx="18" cy="12" r="1.3" />
  </Icon>
);
export const UndoIcon = (p) => (
  <Icon {...p}>
    <path d="M9 7L5 11l4 4" />
    <path d="M5 11h9a5 5 0 0 1 0 10h-2" />
  </Icon>
);
export const OutIcon = (p) => (
  <Icon size={19} width={2.1} {...p}>
    <path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7z" />
    <path d="M12 8v5M12 16.5v.5" />
  </Icon>
);
export const CheckIcon = (p) => (
  <Icon size={14} width={2.6} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);
export const JoinIcon = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="3" />
    <path d="M3.5 18a5.5 5.5 0 0 1 11 0" />
    <path d="M18 8v6M15 11h6" />
  </Icon>
);
export const StarIcon = (p) => (
  <Icon {...p}>
    <path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />
  </Icon>
);
export const ShieldIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
  </Icon>
);
export const TrophyLineIcon = (p) => (
  <Icon {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6" />
  </Icon>
);
export const EyeIcon = (p) => (
  <Icon size={18} {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </Icon>
);
export const GearIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </Icon>
);
export const PoolIcon = (p) => (
  <Icon {...p}>
    <circle cx="7" cy="8" r="2.4" />
    <circle cx="17" cy="8" r="2.4" />
    <circle cx="12" cy="14" r="2.4" />
    <path d="M3 19a4 4 0 0 1 8 0M13 19a4 4 0 0 1 8 0" />
  </Icon>
);
