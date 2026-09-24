// The wording of cricket roles and bowling styles, mirroring BowlingStyles.Describe and
// CricketRoles.Describe on the API (Models/Cricket/CricketEnums.cs).
//
// The API serialises enums as their names (JsonStringEnumConverter in Program.cs), so the
// `value`s below are exactly what travels over the wire in both directions.

export const CRICKET_ROLES = [
  { value: "Batter", label: "Batter" },
  { value: "Bowler", label: "Bowler" },
  { value: "AllRounder", label: "All-rounder" },
  { value: "WicketKeeper", label: "Wicket-keeper" },
  { value: "WicketKeeperBatter", label: "Wicket-keeper batter" },
];

export const BATTING_STYLES = [
  { value: "RightHand", label: "Right-hand bat" },
  { value: "LeftHand", label: "Left-hand bat" },
];

export const BOWLING_ARMS = [
  { value: "Right", label: "Right arm" },
  { value: "Left", label: "Left arm" },
];

export const BOWLING_TYPES = [
  { value: "Fast", label: "Fast" },
  { value: "FastMedium", label: "Fast-medium" },
  { value: "MediumFast", label: "Medium-fast" },
  { value: "Medium", label: "Medium" },
  { value: "FingerSpin", label: "Finger spin" },
  { value: "WristSpin", label: "Wrist spin" },
];

// Bowling style is an arm plus a type rather than one flat list, because the arm is what decides
// what the pair is called — a left-armer's finger spin is "slow left-arm orthodox", a right-armer's
// is an off break. Keeping the pair also makes the impossible combinations unpickable.
const BOWLING_STYLE_LABELS = {
  "Right:Fast": "Right-arm fast",
  "Right:FastMedium": "Right-arm fast-medium",
  "Right:MediumFast": "Right-arm medium-fast",
  "Right:Medium": "Right-arm medium",
  "Right:FingerSpin": "Right-arm off break",
  "Right:WristSpin": "Right-arm leg break",

  "Left:Fast": "Left-arm fast",
  "Left:FastMedium": "Left-arm fast-medium",
  "Left:MediumFast": "Left-arm medium-fast",
  "Left:Medium": "Left-arm medium",
  "Left:FingerSpin": "Slow left-arm orthodox",
  "Left:WristSpin": "Left-arm wrist spin (chinaman)",
};

export function roleLabel(role) {
  return CRICKET_ROLES.find((r) => r.value === role)?.label ?? role ?? "";
}

export function battingStyleLabel(style) {
  return BATTING_STYLES.find((s) => s.value === style)?.label ?? "";
}

/** Null unless both halves are known — half a style has no name. */
export function bowlingStyleLabel(arm, type) {
  if (!arm || !type) return null;
  return BOWLING_STYLE_LABELS[`${arm}:${type}`] ?? `${arm}-arm ${type}`;
}

/** Whether to ask this role how they bowl. A pure batter is not asked. */
export function roleBowls(role) {
  return role === "Bowler" || role === "AllRounder";
}

/** Who may be nominated as wicket-keeper for an XI. */
export function roleKeeps(role) {
  return role === "WicketKeeper" || role === "WicketKeeperBatter";
}

/** "All-rounder · Left-hand bat · Left-arm wrist spin (chinaman)", skipping what is unset. */
export function describePlayer(cricket) {
  if (!cricket) return "";
  return [
    roleLabel(cricket.primaryRole),
    battingStyleLabel(cricket.battingStyle),
    bowlingStyleLabel(cricket.bowlingArm, cricket.bowlingType),
  ]
    .filter(Boolean)
    .join(" · ");
}

export const EMPTY_CRICKET_DRAFT = {
  primaryRole: "Batter",
  battingStyle: "",
  bowlingArm: "",
  bowlingType: "",
  battingOrderPreference: "",
};

/** The draft a form starts from when editing an existing player. */
export function cricketDraftFrom(cricket) {
  if (!cricket) return { ...EMPTY_CRICKET_DRAFT };
  return {
    primaryRole: cricket.primaryRole ?? "Batter",
    battingStyle: cricket.battingStyle ?? "",
    bowlingArm: cricket.bowlingArm ?? "",
    bowlingType: cricket.bowlingType ?? "",
    battingOrderPreference: cricket.battingOrderPreference ?? "",
  };
}

/**
 * Draft to request body. Bowling is dropped for a role that does not bowl, and an arm without a
 * type is dropped entirely — the API rejects half a style.
 */
export function cricketPayload(draft) {
  const bowls = roleBowls(draft.primaryRole);
  const arm = bowls ? draft.bowlingArm || null : null;
  const type = bowls ? draft.bowlingType || null : null;
  const complete = arm && type;
  return {
    primaryRole: draft.primaryRole || "Batter",
    battingStyle: draft.battingStyle || null,
    bowlingArm: complete ? arm : null,
    bowlingType: complete ? type : null,
    battingOrderPreference: draft.battingOrderPreference
      ? Number(draft.battingOrderPreference)
      : null,
  };
}
