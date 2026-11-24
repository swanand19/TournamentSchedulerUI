import { useState } from "react";
import { applyClubSquads } from "../api/clubsApi";
import Modal from "../Modal";
import { Errors, Tick } from "./parts";
import { button, plural, useRun } from "./style";

// The one-dialog question (C-5, C-6, C-20): a player added to a lasting team is already in its squads for
// tournaments still to come; for the ones being played now, its admin ticks which (all ticked to start). Leaving works
// the other way round. The server sends what was done and what can be ticked; a greyed row carries its reason.

export default function SquadQuestion({ club, question, theme, onClose, onSaved }) {
  const open = question.live.filter((l) => !l.reason);
  const [ticked, setTicked] = useState(() => new Set(open.map((l) => l.teamId)));
  const adding = question.change !== "remove";
  const r = useRun();
  const chosen = open.filter((l) => ticked.has(l.teamId));

  const toggle = (teamId) =>
    setTicked((s) => {
      const next = new Set(s);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });

  const apply = async () => {
    if (chosen.length === 0) return onClose();
    const body = adding
      ? { clubPlayerId: question.clubPlayerId, teamIds: chosen.map((l) => l.teamId) }
      : { playerIds: chosen.map((l) => l.playerId).filter((id) => id != null) };
    const next = await r.run("apply", () => applyClubSquads(club.clubId, body));
    if (next) {
      onSaved(next);
      onClose();
    }
  };

  return (
    <Modal labelledBy="squad-question-title" onClose={onClose} panelStyle={{ background: theme.cream, color: theme.ink, borderRadius: 14, padding: "1.2rem", display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 id="squad-question-title" style={{ margin: 0, fontSize: 20 }}>
        {adding ? `Add ${question.playerName} to the tournaments being played now?` : `Leave ${question.playerName} out of the tournaments being played now?`}
      </h2>
      {question.done.length > 0 && (
        <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>
          {adding ? "Already in" : "Already out of"} the squad for {question.done.join(", ")}, which {question.done.length === 1 ? "hasn’t" : "haven’t"} started.
        </p>
      )}
      <Errors message={r.error} />
      {question.live.map((l) => (
        <Tick key={l.teamId} theme={theme} on={ticked.has(l.teamId)} reason={l.reason} onToggle={() => toggle(l.teamId)} title={l.tournamentName} detail={`As ${l.teamName}`} />
      ))}
      <p style={{ margin: 0, fontSize: 13, color: theme.muted }}>
        {adding ? "Not now? You can add them later from the tournament’s team page." : "Matches they have played stay on the scorecards either way."}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={apply} disabled={!!r.busy} style={button(theme)}>
          {chosen.length === 0 ? "Done" : `${adding ? "Add to" : "Leave out of"} ${plural(chosen.length, "tournament")}`}
        </button>
        <button onClick={onClose} style={button(theme, "secondary")}>{adding ? "Only the team for now" : "Keep them in for now"}</button>
      </div>
    </Modal>
  );
}
