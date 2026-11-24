import { Fragment, useEffect, useState } from "react";
import { useSource } from "./api/source";

// A leaderboard row unfolded (2026-11-20, as on the phone): the player's own innings ("45* (32)"),
// spells ("4-0-28-2"), goals or assists in this tournament, one line a match. Loaded only when a row
// is opened, through useSource(), so the public page gets it too.

const HEADING = { batting: "Innings", bowling: "Spells", goals: "Goals", assists: "Assists" };
const NONE = { batting: "No innings yet.", bowling: "No spells yet.", goals: "No goals yet.", assists: "No assists yet." };

/** The small button beside a player's name. */
export function LinesToggle({ open, onToggle, noun, name, color }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${open ? "Hide" : "Show"} ${name}'s ${noun}`}
      style={{
        marginLeft: 8,
        minHeight: 28,
        padding: "0.1rem 0.5rem",
        border: `1px solid ${color}`,
        borderRadius: 999,
        background: "transparent",
        color,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {noun} {open ? "▴" : "▾"}
    </button>
  );
}

/** The unfolded lines, as a full-width row under the player's row. */
export function LinesRow({ tournamentId, playerId, kinds, colSpan, ink, muted }) {
  const src = useSource();
  const [state, setState] = useState({ data: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    src
      .playerLines(tournamentId, playerId)
      .then((data) => !cancelled && setState({ data, error: "" }))
      .catch((e) => !cancelled && setState({ data: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [src, tournamentId, playerId]);

  const { data, error } = state;
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: "0.2rem 0.7rem 0.8rem 3.2rem", textAlign: "left", whiteSpace: "normal" }}>
        {!data && !error && <span style={{ fontSize: 13, color: muted }}>Loading…</span>}
        {error && <span style={{ fontSize: 13, color: muted }}>{error}</span>}
        {data && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem 2.5rem" }}>
            {kinds.map((kind) => (
              <div key={kind} style={{ minWidth: 220 }}>
                {kinds.length > 1 && (
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: muted, margin: "0 0 4px" }}>
                    {HEADING[kind]}
                  </div>
                )}
                {data[kind].length === 0 ? (
                  <span style={{ fontSize: 13, color: muted }}>{NONE[kind]}</span>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
                    {data[kind].map((line, i) => (
                      <li key={`${line.matchId}-${i}`} style={{ display: "flex", gap: 12, fontSize: 13, alignItems: "baseline" }}>
                        <span style={{ color: muted, minWidth: 34 }}>M{line.matchNumber}</span>
                        <span style={{ color: ink, flex: 1 }}>
                          vs {line.opponent}
                          {(line.detail || line.inPlay) && (
                            <span style={{ color: muted }}>
                              {" · "}
                              {[line.detail, line.inPlay ? "in play" : null].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </span>
                        <span className="num" style={{ color: ink, fontWeight: 700 }}>{line.value}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

/** Wraps a table row and, when open, its unfolded lines. */
export function RowWithLines({ rowKey, children, open, unfold, tournamentId, playerId, colSpan, ink, muted }) {
  return (
    <Fragment key={rowKey}>
      {children}
      {open && unfold && (
        <LinesRow tournamentId={tournamentId} playerId={playerId} kinds={unfold.kinds} colSpan={colSpan} ink={ink} muted={muted} />
      )}
    </Fragment>
  );
}
