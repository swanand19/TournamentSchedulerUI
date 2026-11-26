import { Fragment, useEffect, useState } from "react";
import { useSource } from "./api/source";
import { DownIcon } from "./ui/icons";

// A leaderboard row unfolded (2026-11-20, as on the phone): the player's own innings ("45* (32)"),
// spells ("4-0-28-2"), goals or assists in this tournament, one line a match. Loaded only when a row
// is opened, through useSource(), so the public page gets it too.

const HEADING = { batting: "Innings", bowling: "Spells", goals: "Goals", assists: "Assists" };
const NONE = { batting: "No innings yet.", bowling: "No spells yet.", goals: "No goals yet.", assists: "No assists yet." };

/** The small button beside a player's name: "Innings ⌄". */
export function LinesToggle({ open, onToggle, noun, name }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${open ? "Hide" : "Show"} ${name}'s ${noun.toLowerCase()}`}
      className="kc-link"
      style={{ marginLeft: 8, minHeight: 28, fontSize: 13, fontWeight: 500, gap: 2, verticalAlign: "middle" }}
    >
      {noun}
      <span aria-hidden="true" style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms var(--ease-out)" }}>
        <DownIcon size={14} />
      </span>
    </button>
  );
}

/** The unfolded lines, as a full-width row under the player's row: one chip a match. */
export function LinesRow({ tournamentId, playerId, kinds, colSpan }) {
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
      <td colSpan={colSpan} style={{ padding: "0 12px 14px 56px", textAlign: "left", whiteSpace: "normal" }}>
        {!data && !error && <span className="kc-cap">Loading…</span>}
        {error && <span className="kc-cap">{error}</span>}
        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {kinds.map((kind) => (
              <div key={kind}>
                {kinds.length > 1 && <div className="kc-cap" style={{ margin: "0 0 6px" }}>{HEADING[kind]}</div>}
                {data[kind].length === 0 ? (
                  <span className="kc-cap">{NONE[kind]}</span>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {data[kind].map((line, i) => (
                      <li key={`${line.matchId}-${i}`} style={{ borderRadius: 14, padding: "8px 12px", fontSize: 14, background: "var(--chip)" }}>
                        <b className="num" style={{ fontWeight: "var(--w-strong)", marginRight: 6 }}>{line.value}</b>
                        v {line.opponent} · match {line.matchNumber}
                        {(line.detail || line.inPlay) && (
                          <span style={{ color: "var(--muted)" }}>
                            {" · "}
                            {[line.detail, line.inPlay ? "in play" : null].filter(Boolean).join(" · ")}
                          </span>
                        )}
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
export function RowWithLines({ rowKey, children, open, unfold, tournamentId, playerId, colSpan }) {
  return (
    <Fragment key={rowKey}>
      {children}
      {open && unfold && (
        <LinesRow tournamentId={tournamentId} playerId={playerId} kinds={unfold.kinds} colSpan={colSpan} />
      )}
    </Fragment>
  );
}
