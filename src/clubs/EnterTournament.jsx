import { useEffect, useRef, useState } from "react";
import { listMyClubs, previewEntry, sendEntry, updateEntry, withdrawEntry } from "../api/clubsApi";
import { themeFor } from "../theme";
import { Card, Errors, Logo, Page, Tick } from "./parts";
import { button, input, label, plural, useRun } from "./style";

// "Enter a tournament" on the web (plan section 6, step 3): a lasting team's admin types the organiser's entry code —
// the only way in (C-11) — sees the tournament and who's in it, picks the squad (everyone ticked; anyone with a place
// there already greyed with the server's reason) and sends it; the organiser accepts or declines (C-7). Until then the
// squad and name can change and the entry can be withdrawn. Opened from the team page, from a waiting entry
// (`entryId`), or from a shared link /enter/<code> — then the person first picks which of their teams enters.

export default function EnterTournament({ clubId: givenClub, entryId, code: givenCode, onBack, onOpenTournament }) {
  const [clubId, setClubId] = useState(givenClub ?? null);
  const [clubs, setClubs] = useState(null);
  const [code, setCode] = useState(givenCode ?? "");
  const [preview, setPreview] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [ticked, setTicked] = useState(new Set());
  const r = useRun();
  const started = useRef(false);
  const theme = themeFor(preview?.sport ?? "Cricket");

  const show = (p) => {
    setPreview(p);
    setTeamName(p.teamName);
    setTicked(new Set(p.players.filter((x) => x.ticked).map((x) => x.clubPlayerId)));
  };

  // A shared link: which of my teams? A waiting entry or a code with the team known: straight to it.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (clubId == null) {
      r.run("clubs", async () => setClubs((await listMyClubs()).filter((c) => c.isAdmin)));
    } else if (entryId != null || givenCode) {
      r.run("find", async () => show(await previewEntry(entryId != null ? { clubId, entryId } : { clubId, code: givenCode })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickClub = (id) => {
    setClubId(id);
    if (code) r.run("find", async () => show(await previewEntry({ clubId: id, code })));
  };

  const find = (e) => {
    e.preventDefault();
    r.run("find", async () => show(await previewEntry({ clubId, code: code.trim() })));
  };

  const waiting = preview?.entryStatus === "Waiting";
  const accepted = preview?.entryStatus === "Accepted";
  const picked = preview ? preview.players.filter((p) => ticked.has(p.clubPlayerId)).length : 0;

  const toggle = (id) =>
    setTicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = (e) => {
    e.preventDefault();
    const body = { clubId, code: preview.code, teamName: teamName.trim(), clubPlayerIds: [...ticked] };
    r.run("send", async () => show(waiting ? await updateEntry(preview.entryId, body) : await sendEntry(body)));
  };

  const withdraw = async () => {
    if (!window.confirm(`Withdraw the entry? ${preview.tournamentName}'s organiser won't see it any more.`)) return;
    if ((await r.run("withdraw", () => withdrawEntry(preview.entryId))) !== undefined) onBack();
  };

  return (
    <Page theme={theme} back="Back" onBack={onBack} eyebrow={preview?.clubName} title="Enter a tournament">
      <Errors message={r.error} />

      {clubId == null ? (
        <Card theme={theme}>
          <strong>Which of your teams enters?</strong>
          {clubs == null ? (
            <span style={{ color: theme.muted }}>Loading…</span>
          ) : clubs.length === 0 ? (
            <span style={{ color: theme.muted }}>Only a team’s admins can enter it. Make a team on Home first, or ask its admin to enter it.</span>
          ) : (
            clubs.map((c) => (
              <button key={c.clubId} onClick={() => pickClub(c.clubId)} className="pressable" style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "1px solid #e0dccf", borderRadius: 10, padding: "0.6rem 0.8rem", cursor: "pointer", textAlign: "left" }}>
                <Logo link={c.logoUrl} name={c.name} size={36} theme={{ ...theme, onDark: theme.ink, surfaceOnDark: "#EDEAE0", borderOnDark: "#e0dccf" }} />
                <span style={{ flex: 1 }}>
                  <strong>{c.name}</strong>
                  <span style={{ display: "block", fontSize: 13, color: theme.muted }}>{[c.sport, c.area, plural(c.players, "player")].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            ))
          )}
        </Card>
      ) : !preview ? (
        entryId != null ? (
          <p style={{ color: theme.onDarkMuted }}>{r.busy ? "Loading…" : ""}</p>
        ) : (
          <Card theme={theme}>
            <form onSubmit={find} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label htmlFor="entry-code" style={label(theme)}>The tournament’s entry code (or the whole link the organiser sent)</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input id="entry-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. K7MQ2DX4P" autoComplete="off" style={input} />
                <button type="submit" disabled={code.trim().length < 9 || !!r.busy} style={button(theme)}>{r.busy ? "Finding…" : "Find tournament"}</button>
              </div>
            </form>
          </Card>
        )
      ) : (
        <>
          <Card theme={theme} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Logo link={preview.logoUrl} name={preview.tournamentName} size={52} theme={{ ...theme, onDark: theme.ink, surfaceOnDark: "#EDEAE0", borderOnDark: "#e0dccf" }} />
            <span>
              <strong style={{ fontSize: 18 }}>{preview.tournamentName}</strong>
              <span style={{ display: "block", fontSize: 14, color: theme.muted }}>
                Run by {preview.organiser}. {preview.teams.length === 0 ? "No teams in it yet." : `In it: ${preview.teams.join(", ")}.`}
              </span>
            </span>
          </Card>

          {(waiting || accepted) && (
            <Card theme={theme}>
              <strong>{accepted ? `${preview.teamName} is in.` : "Waiting for the organiser to answer."}</strong>
              <span style={{ fontSize: 14, color: theme.muted }}>
                {accepted ? "Change its squad from the tournament’s teams." : "You can change the squad or the name until then. You’ll hear when they answer."}
              </span>
              {waiting && <button onClick={withdraw} disabled={!!r.busy} style={{ ...button(theme, "secondary"), alignSelf: "flex-start" }}>Withdraw the entry</button>}
              {accepted && <button onClick={() => onOpenTournament(preview.tournamentId)} style={{ ...button(theme), alignSelf: "flex-start" }}>Open the tournament</button>}
            </Card>
          )}

          {!accepted && (
            <Card theme={theme}>
              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={label(theme)}>
                  Your team’s name in this tournament
                  <input value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={100} style={{ ...input, width: "100%", marginTop: 4 }} />
                </label>
                {preview.teamNameProblem && teamName.trim() === preview.teamName && <span style={{ fontSize: 13, color: "#8a4b1b" }}>{preview.teamNameProblem}</span>}
                <strong style={{ marginTop: 8 }}>The squad · {picked} of {preview.players.length}</strong>
                {preview.players.map((p) => (
                  <Tick key={p.clubPlayerId} theme={theme} on={ticked.has(p.clubPlayerId)} reason={p.reason} onToggle={() => toggle(p.clubPlayerId)} title={`${p.name}${p.isCaptain ? " · Captain" : ""}`} detail={p.detail} />
                ))}
                <button type="submit" disabled={picked === 0 || !teamName.trim() || !!r.busy} style={{ ...button(theme), alignSelf: "flex-start", marginTop: 8 }}>
                  {waiting ? "Save changes" : `Send entry · ${plural(picked, "player")}`}
                </button>
              </form>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
