import { useEffect, useState } from "react";
import { getPublicClub } from "../api/clubsApi";
import { themeFor } from "../theme";
import { Card, Errors, Heading, Page } from "./parts";

// A lasting team's public page at /team/<code> (C-15, plan 8.3): for anyone with the link, signed in or not. Names and
// results only — the server strips emails, numbers, codes and photos. A tournament that is public links to its live scores.

const SECTIONS = [
  { key: "live", title: "BEING PLAYED" },
  { key: "upcoming", title: "STILL TO PLAY" },
  { key: "past", title: "PLAYED" },
];

export default function PublicTeam({ code }) {
  const [club, setClub] = useState(null);
  const [error, setError] = useState("");
  const theme = themeFor(club?.sport ?? "Cricket");

  useEffect(() => {
    getPublicClub(code)
      .then((c) => {
        setClub(c);
        document.title = `${c.name} · KickCricket`;
      })
      .catch((e) => setError(e.message));
  }, [code]);

  if (!club) {
    return (
      <Page theme={theme} title="Team">
        {error ? <Errors message={error} /> : <p style={{ color: theme.onDarkMuted }}>Loading…</p>}
      </Page>
    );
  }

  return (
    <Page theme={theme} logo={club.logoUrl} eyebrow={[`${theme.label} team`, club.area].filter(Boolean).join(" · ")} title={club.name}>
      {club.runBy.length > 0 && <p style={{ margin: 0, color: theme.onDarkMuted }}>Run by {club.runBy.join(", ")}</p>}
      <Card theme={theme} style={{ flexDirection: "row", justifyContent: "space-around", textAlign: "center", padding: "0.8rem" }}>
        {[
          [club.totals.tournaments, "Tournaments"],
          [club.totals.matches, "Matches"],
          [club.totals.won, "Won"],
          [club.totals.titles, "Titles"],
        ].map(([value, word]) => (
          <div key={word}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: 13, color: theme.muted }}>{word}</div>
          </div>
        ))}
      </Card>

      {SECTIONS.map((s) => {
        const rows = club.tournaments.filter((t) => t.section === s.key);
        if (rows.length === 0) return null;
        return (
          <div key={s.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Heading theme={theme}>{s.title}</Heading>
            {rows.map((t, i) => (
              <Card key={i} theme={theme} style={{ flexDirection: "row", alignItems: "center", padding: "0.8rem 1rem" }}>
                <span style={{ flex: 1 }}>
                  <strong>{t.champion ? "🏆 " : ""}{t.name}</strong>
                  <span style={{ display: "block", fontSize: 13, color: theme.muted }}>{t.line}</span>
                </span>
                {t.liveCode && <a href={`/live/${t.liveCode}`} style={{ color: theme.successInk, fontWeight: 600 }}>Scores →</a>}
              </Card>
            ))}
          </div>
        );
      })}

      <Heading theme={theme}>PLAYERS · {club.players.length}</Heading>
      <Card theme={theme}>
        {club.players.length === 0 ? (
          <span style={{ color: theme.muted }}>No players yet.</span>
        ) : (
          club.players.map((p, i) => (
            <span key={i} style={{ padding: "4px 0", borderBottom: "1px solid #e4e0d4" }}>
              <strong style={{ fontWeight: 600 }}>{p.name}</strong>
              {p.isCaptain ? " · Captain" : ""}
              {p.detail ? <span style={{ color: theme.muted }}> · {p.detail}</span> : null}
            </span>
          ))
        )}
      </Card>
      <p style={{ color: theme.onDarkMuted, fontSize: 13 }}>
        Scored live on KickCricket. <a href="/" style={{ color: theme.onDark }}>Open the app</a>
      </p>
    </Page>
  );
}
