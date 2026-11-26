import { useEffect, useState } from "react";
import { setAppearance, useAppearance } from "./appearance";
import { getCareer, getProfile } from "./api/profileApi";
import ErrorBanner from "./ErrorBanner";
import { font, footballTheme, themeFor } from "./theme";
import { formatPhone } from "./useAuthOptions";
import { pictureSrc } from "./pictures";
import { FollowButton, FollowListDialog } from "./people/PeopleBits";

// A person's profile and career, from the "Profile & Career Stats" designs: who they are in a side
// column, and the chosen sport's career beside it — Stats (cricket splits it into batting, bowling
// and fielding), Teams, Tournaments, Honours. On a phone the columns stack. Figures arrive worded
// by the server, completed matches only. A team or tournament opens only when the server says the
// viewer may see it (`canOpen`: they own, score or play in it).

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Some API timestamps come without a zone; they are UTC. */
const parseUtc = (v) => (v ? new Date(/Z$|[+-]\d{2}:\d{2}$/.test(v) ? v : `${v}Z`) : null);
const monthYear = (v) => {
  const d = parseUtc(v);
  return d ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : "";
};
const shortDate = (v) => {
  const d = parseUtc(v);
  return d ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}` : "";
};
const dateRange = (a, b) => {
  if (!a || !b) return "";
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const m = (n) => MONTHS[n - 1].slice(0, 3);
  if (ay !== by) return `${ad} ${m(am)} ${ay} – ${bd} ${m(bm)} ${by}`;
  if (am !== bm) return `${ad} ${m(am)} – ${bd} ${m(bm)} ${by}`;
  return `${ad} – ${bd} ${m(bm)} ${by}`;
};
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const initials = (name) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return w.length === 0 ? "?" : w.length === 1 ? w[0].slice(0, 2) : (w[0][0] + w[1][0]);
};

/** The figure that leads each stat group. */
const HERO = { overview: "goals", batting: "runs", bowling: "wickets", fielding: "catches" };
const TABS = [
  ["stats", "Stats"],
  ["teams", "Teams"],
  ["tournaments", "Tournaments"],
  ["honours", "Honours"],
];

const plainButton = { background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", color: "inherit" };

function AppearanceChoice() {
  const { choice } = useAppearance();
  return (
    <div>
      <div className="kc-cap" style={{ marginBottom: 8 }}>Appearance</div>
      <div className="kc-seg" role="radiogroup" aria-label="Appearance">
        {[
          ["system", "Device"],
          ["dark", "Dark"],
          ["light", "Light"],
        ].map(([key, label]) => (
          <button key={key} type="button" role="radio" aria-checked={choice === key} className={choice === key ? "on" : undefined} onClick={() => setAppearance(key)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Profile({ who, onBack, onEditAccount, onOpenTournament, onOpenPerson, onWatchMatch }) {
  const [profile, setProfile] = useState(null);
  // Following (2026-11-23): the counts after a click on Follow, and the followers / following dialog.
  const [followHere, setFollowHere] = useState(null);
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [sport, setSport] = useState(null);

  useEffect(() => {
    let live = true;
    getProfile(who)
      .then((p) => {
        if (!live) return;
        setProfile(p);
        // Open on the sport they've played most; a newcomer starts on the first.
        const best = [...p.sports].sort((a, b) => b.matches - a.matches)[0];
        setSport(best?.sport ?? "Football");
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [who]);

  const base = footballTheme;

  return (
    <div style={{ color: base.onDark }} data-sport={sport ?? undefined}>
      <div className="kc-wrap" style={{ paddingTop: 14 }}>
        <button type="button" className="kc-link" onClick={onBack} style={{ minHeight: 40, fontWeight: 500 }}>
          ← Back
        </button>
      </div>

      <main
        className="kc-wrap"
        style={{
          padding: "1rem 0 3rem",
          display: "flex",
          flexWrap: "wrap",
          gap: 32,
          alignItems: "flex-start",
        }}
      >
        {error && !profile ? (
          <div style={{ flex: "1 1 100%" }}>
            <ErrorBanner message={error} />
          </div>
        ) : null}
        {!profile && !error ? <p style={{ color: base.onDarkMuted }}>Loading the profile…</p> : null}
        {profile ? (
          <>
            <Identity
              profile={profile}
              follow={followHere?.userId === profile.userId ? followHere.follow : profile.follow}
              onFollowed={(follow) => setFollowHere({ userId: profile.userId, follow })}
              onList={(tab) => setList(tab)}
              onWatchMatch={onWatchMatch}
              sport={sport}
              onSport={setSport}
              onEditAccount={onEditAccount}
            />
            {list && (
              <FollowListDialog
                key={`${profile.userId}-${list}`}
                userId={profile.userId}
                initialTab={list}
                theme={themeFor("Football")}
                onClose={() => setList(null)}
                onOpenPerson={(userId) => {
                  setList(null);
                  onOpenPerson(userId);
                }}
              />
            )}
            {sport ? (
              <CareerPanel key={sport} sport={sport} userId={profile.isMe ? undefined : profile.userId} onOpenTournament={onOpenTournament} />
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}

function Identity({ profile, follow, onFollowed, onList, onWatchMatch, sport, onSport, onEditAccount }) {
  const t = footballTheme;
  const light = themeFor("Football");
  const tournaments = profile.sports.reduce((n, s) => n + s.tournaments, 0);
  const first = profile.name.split(" ")[0];
  return (
    <aside style={{ flex: "1 1 280px", maxWidth: 360, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          aria-hidden="true"
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: t.deckRaised,
            boxShadow: `inset 0 0 0 2px ${t.borderOnDark}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: font.display,
            fontSize: 34,
            overflow: "hidden",
          }}
        >
          {/* Their photo (HLD P-26) fills the circle; initials while there's none. */}
          {profile.photoUrl ? (
            <img src={pictureSrc(profile.photoUrl)} alt="" width={88} height={88} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials(profile.name)
          )}
        </div>
        <div>
          <h1 className="kc-title">{profile.name}</h1>
          <div style={{ fontSize: 15, color: t.onDarkMuted, marginTop: 4 }}>
            Playing since {monthYear(profile.memberSince)}
            {profile.tournamentsRun > 0 ? ` · Organiser of ${plural(profile.tournamentsRun, "tournament")}` : ""}
          </div>
        </div>
        {profile.isMe ? (
          <button
            onClick={onEditAccount}
            style={{ ...plainButton, alignSelf: "flex-start", minHeight: 40, padding: "0 16px", borderRadius: 999, border: `1px solid ${t.borderOnDark}`, fontSize: 14, fontWeight: 600 }}
          >
            Edit account
          </button>
        ) : null}
        {/* Dark or light, kept in this browser (the phone keeps its own); follows the device unless chosen. */}
        {profile.isMe ? <AppearanceChoice /> : null}
      </div>

      {follow ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {[
            ["Followers", follow.followers, () => onList("followers")],
            ["Following", follow.following, () => onList("following")],
            ["Tournaments", tournaments, null],
          ].map(([label, value, onClick]) => {
            const inner = (
              <>
                <span style={{ display: "block", fontSize: 22, fontWeight: 700 }}>{value}</span>
                <span style={{ fontSize: 12, color: t.onDarkMuted }}>{label}</span>
              </>
            );
            const box = { borderRadius: 12, border: `1px solid ${t.borderOnDark}`, padding: "10px 4px", textAlign: "center", minHeight: 64 };
            return onClick ? (
              <button key={label} type="button" onClick={onClick} aria-label={`${value} ${label}. Opens the list`} style={{ ...plainButton, ...box }}>
                {inner}
              </button>
            ) : (
              <div key={label} style={box}>
                {inner}
              </div>
            );
          })}
        </div>
      ) : null}

      {follow && !profile.isMe ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <FollowButton userId={profile.userId} name={profile.name} state={follow} theme={{ ...light, deep: t.accent, cream: t.night }} onChanged={onFollowed} />
          <span style={{ fontSize: 13, color: t.onDarkMuted }}>
            {follow.isFollowing
              ? `You'll hear when ${first} starts a match you can watch.`
              : follow.followsMe
                ? "Follows you."
                : `Follow to hear when ${first} starts a match you can watch.`}
          </span>
        </div>
      ) : null}

      {profile.playingNow?.map((m) => (
        <button
          key={`${m.sport}-${m.matchId}`}
          type="button"
          onClick={() => onWatchMatch(m.tournamentId, m.matchId)}
          style={{ ...plainButton, textAlign: "left", borderRadius: 12, background: t.surfaceOnDark, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 2 }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: t.liveOnDark ?? t.accent }}>● Playing now · watch live</span>
          <span style={{ fontWeight: 700 }}>{m.match}</span>
          <span style={{ fontSize: 13, color: t.onDarkMuted }}>{m.tournamentName}</span>
        </button>
      ))}

      {profile.isMe && (profile.email || profile.phone) ? (
        <div>
          <div style={{ borderRadius: 12, background: t.surfaceOnDark, fontSize: 14 }}>
            {profile.email ? <div style={{ padding: "12px 14px", borderBottom: profile.phone ? `1px solid ${t.borderOnDark}` : "none" }}>{profile.email}</div> : null}
            {profile.phone ? <div style={{ padding: "12px 14px" }}>{formatPhone(profile.phone)}</div> : null}
          </div>
          <div style={{ fontSize: 12, color: t.onDarkMuted, marginTop: 6 }}>Only you see your email and phone.</div>
        </div>
      ) : null}

      <nav aria-label="Sport profiles" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {profile.sports.map((card) => {
          const st = themeFor(card.sport);
          const on = card.sport === sport;
          const headline = card.headline[0];
          return (
            <button
              key={card.sport}
              onClick={() => onSport(card.sport)}
              aria-current={on ? "page" : undefined}
              style={{
                ...plainButton,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                textAlign: "left",
                background: on ? st.deck : "transparent",
                border: on ? "1px solid transparent" : `1px solid ${t.borderOnDark}`,
                boxShadow: on ? `inset 3px 0 0 ${st.accent}` : "none",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  flex: "none",
                  background: `repeating-linear-gradient(90deg, ${st.stripes[0]} 0 8px, ${st.stripes[1]} 8px 16px)`,
                }}
              />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 600 }}>{st.label}</span>
                <span style={{ fontSize: 13, color: t.onDarkMuted }}>
                  {card.matches > 0 ? `${plural(card.matches, "match", "matches")}${headline ? ` · ${headline.value} ${headline.label.toLowerCase()}` : ""}` : `No ${st.label.toLowerCase()} matches yet`}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function CareerPanel({ sport, userId, onOpenTournament }) {
  const theme = themeFor(sport);
  const [career, setCareer] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("stats");
  const [group, setGroup] = useState("");

  useEffect(() => {
    let live = true;
    getCareer(sport, { userId })
      .then((c) => live && setCareer(c))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [sport, userId]);

  const tabStyle = (on) => ({
    ...plainButton,
    minHeight: 44,
    padding: "0 12px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    flex: "none",
    color: on ? theme.onDark : theme.onDarkMuted,
    boxShadow: on ? `inset 0 -3px 0 ${theme.accent}` : "none",
  });

  const groups = career?.statGroups ?? [];
  const current = groups.find((g) => g.key === group) ?? groups[0];

  return (
    <section style={{ flex: "999 1 560px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: -0.3 }}>{theme.label}</h2>
      <ErrorBanner message={error} />

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: `1px solid ${theme.borderOnDark}` }}>
        <div role="tablist" aria-label={`${theme.label} profile`} style={{ display: "flex", gap: 2, overflowX: "auto", maxWidth: "100%" }}>
          {TABS.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} style={tabStyle(tab === key)}>
              {label}
            </button>
          ))}
        </div>
        {tab === "stats" && groups.length > 1 && career?.matches > 0 ? (
          <div role="tablist" aria-label="Discipline" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: theme.deck, marginBottom: 6 }}>
            {groups.map((g) => {
              const on = g.key === current?.key;
              return (
                <button
                  key={g.key}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setGroup(g.key)}
                  style={{ ...plainButton, minHeight: 34, padding: "0 14px", borderRadius: 8, fontSize: 14, fontWeight: on ? 700 : 600, background: on ? theme.accent : "transparent", color: on ? theme.accentInk : theme.onDarkMuted }}
                >
                  {g.title}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {!career && !error ? <p style={{ color: theme.onDarkMuted }}>Loading…</p> : null}
      {career && tab === "stats" ? <StatsTab career={career} group={current} theme={theme} /> : null}
      {career && tab === "teams" ? <TeamsTab career={career} theme={theme} onOpenTournament={onOpenTournament} /> : null}
      {career && tab === "tournaments" ? <TournamentsTab career={career} theme={theme} onOpenTournament={onOpenTournament} /> : null}
      {career && tab === "honours" ? <HonoursTab career={career} theme={theme} /> : null}
    </section>
  );
}

function Empty({ title, message, theme }) {
  return (
    <div style={{ border: `1px dashed ${theme.borderOnDark}`, borderRadius: 14, padding: "28px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
      <p style={{ margin: "6px auto 0", maxWidth: "52ch", color: theme.onDarkMuted, fontSize: 14, lineHeight: 1.45 }}>{message}</p>
    </div>
  );
}

function Tile({ stat, theme, hero }) {
  const card = stat.key === "yellowCards" ? theme.yellowCard : stat.key === "redCards" ? theme.redCard : null;
  return (
    <div
      style={{
        gridColumn: hero ? "span 2" : undefined,
        borderRadius: hero ? 16 : 12,
        background: theme.deck,
        border: hero ? "none" : `1px solid ${theme.borderOnDark}`,
        padding: hero ? "18px 20px" : "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: hero ? 14 : 13, color: theme.onDarkMuted }}>
        {card ? <span aria-hidden="true" style={{ width: 9, height: 12, borderRadius: 2, background: card }} /> : null}
        {stat.label}
      </div>
      <div
        style={{
          fontFamily: font.display,
          fontSize: hero ? 84 : 34,
          lineHeight: hero ? "88px" : "40px",
          color: hero ? theme.accent : stat.value === "0" ? theme.onDarkMuted : theme.onDark,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {stat.value}
      </div>
      {stat.sub ? <div style={{ fontSize: 12, color: theme.onDarkMuted }}>{stat.sub}</div> : null}
    </div>
  );
}

function StatsTab({ career, group, theme }) {
  if (career.matches === 0)
    return (
      <Empty
        theme={theme}
        title={`No ${theme.label.toLowerCase()} matches yet`}
        message={
          career.isMe
            ? `Your figures fill in here once you play in a completed ${theme.label.toLowerCase()} match. Join a team with its code, or ask the organiser to add you by email.`
            : `${career.name} hasn't completed a ${theme.label.toLowerCase()} match yet.`
        }
      />
    );
  if (!group) return null;
  const hero = group.stats.find((s) => s.key === HERO[group.key]) ?? group.stats[0];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
      <Tile stat={hero} theme={theme} hero />
      {group.stats
        .filter((s) => s !== hero)
        .map((s) => (
          <Tile key={s.key} stat={s} theme={theme} />
        ))}
    </div>
  );
}

const statusColour = (status, theme) => (status === "Live" ? theme.liveOnDark : theme.onDarkMuted);

function TeamsTab({ career, theme, onOpenTournament }) {
  if (career.teams.length === 0)
    return <Empty theme={theme} title="No teams yet" message={career.isMe ? `Teams you play ${theme.label.toLowerCase()} for appear here.` : `${career.name} isn't in a ${theme.label.toLowerCase()} team yet.`} />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
      {career.teams.map((t) => (
        <div key={t.teamId} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, background: theme.deck, border: `1px solid ${theme.borderOnDark}` }}>
          <div aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 10, background: theme.deckRaised, color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 16, flex: "none" }}>
            {initials(t.teamName)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {t.teamName}
              {t.isCaptain ? <span style={{ fontSize: 12, fontWeight: 700, padding: "1px 7px", borderRadius: 5, background: theme.accent, color: theme.accentInk }}>Captain</span> : null}
            </div>
            {onOpenTournament && t.canOpen ? (
              <button onClick={() => onOpenTournament(t.tournamentId)} style={{ ...plainButton, fontSize: 13, color: theme.onDark, textDecoration: "underline", textUnderlineOffset: 3 }}>
                {t.tournamentName}
              </button>
            ) : (
              <div style={{ fontSize: 13, color: theme.onDarkMuted }}>{t.tournamentName}</div>
            )}
            <div style={{ fontSize: 13, color: theme.onDarkMuted }}>
              {plural(t.matches, "match", "matches")} · <span style={{ color: statusColour(t.tournamentStatus, theme) }}>{t.tournamentStatus}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TournamentsTab({ career, theme, onOpenTournament }) {
  if (career.tournaments.length === 0)
    return <Empty theme={theme} title="No tournaments yet" message={`${theme.label} tournaments ${career.isMe ? "you play in" : `${career.name} plays in`} appear here.`} />;
  const columns = ["Matches", ...career.tournaments[0].highlights.map((h) => h.label)];
  const cell = { padding: "12px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" };
  return (
    <div style={{ overflowX: "auto", borderRadius: 12, background: theme.deck }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 520 }}>
        <thead>
          <tr style={{ color: theme.onDarkMuted, textAlign: "left" }}>
            <th scope="col" style={{ padding: "12px 14px", fontWeight: 600 }}>Tournament</th>
            <th scope="col" style={{ padding: "12px 14px", fontWeight: 600 }}>Team</th>
            {columns.map((c) => (
              <th key={c} scope="col" style={{ ...cell, fontWeight: 600 }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {career.tournaments.map((t) => (
            <tr key={t.tournamentId} style={{ borderTop: `1px solid ${theme.borderOnDark}` }}>
              <td style={{ padding: "12px 14px" }}>
                {onOpenTournament && t.canOpen ? (
                  <button onClick={() => onOpenTournament(t.tournamentId)} style={{ ...plainButton, fontWeight: 600, textAlign: "left" }}>
                    {t.name}
                  </button>
                ) : (
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                )}
                <div style={{ fontSize: 12, color: statusColour(t.status, theme) }}>
                  {t.status}
                  {dateRange(t.startDate, t.endDate) ? <span style={{ color: theme.onDarkMuted }}> · {dateRange(t.startDate, t.endDate)}</span> : null}
                </div>
              </td>
              <td style={{ padding: "12px 14px" }}>{t.teamName}</td>
              <td style={cell}>{t.matches}</td>
              {t.highlights.map((h) => (
                <td key={h.key} style={cell}>
                  {h.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HonoursTab({ career, theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${career.honourStats.length}, minmax(0, 1fr))`, borderRadius: 16, background: theme.deck, overflow: "hidden" }}>
        {career.honourStats.map((s, i) => (
          <div key={s.key} style={{ padding: "16px 18px", borderLeft: i > 0 ? `1px solid ${theme.borderOnDark}` : "none" }}>
            <div style={{ fontFamily: font.display, fontSize: 44, lineHeight: "48px", color: i === 0 ? theme.accent : theme.onDark }}>{s.value}</div>
            <div style={{ fontSize: 13, color: theme.onDarkMuted }}>{s.label}</div>
          </div>
        ))}
      </div>
      {career.honours.length === 0 ? (
        <Empty
          theme={theme}
          title="No honours yet"
          message={theme.key === "Cricket" ? "Player of the match awards and tournament MVPs appear here." : "Titles go to the top scorer and top assister when a tournament is completed."}
        />
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {career.honours.map((h, i) => (
            <li key={`${h.kind}-${h.tournamentId}-${h.matchId ?? i}`} style={{ display: "flex", gap: 14, padding: 14, borderRadius: 14, background: theme.deck, border: `1px solid ${theme.borderOnDark}` }}>
              <span
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  flex: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: h.kind === "TournamentMvp" ? theme.accent : "transparent",
                  boxShadow: h.kind === "TournamentMvp" ? "none" : `inset 0 0 0 2px ${theme.accent}`,
                  color: h.kind === "TournamentMvp" ? theme.accentInk : theme.accent,
                  fontFamily: font.display,
                  fontSize: 16,
                }}
              >
                {h.kind === "TournamentMvp" ? "★" : h.kind === "PlayerOfMatch" ? "PM" : "1"}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{h.title}</div>
                <div style={{ color: theme.accent, fontWeight: 600, fontSize: 14 }}>{h.detail}</div>
                <div style={{ fontSize: 13, color: theme.onDarkMuted }}>{h.context ?? h.tournamentName}</div>
                <div style={{ fontSize: 12, color: theme.onDarkMuted }}>
                  {h.matchId ? [h.tournamentName, shortDate(h.date)].filter(Boolean).join(" · ") : h.date ? `Completed ${shortDate(h.date)}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
