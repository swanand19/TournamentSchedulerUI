import { useCallback, useEffect, useRef, useState } from "react";
import { followPerson, getFollowers, getFollowing, removeFollower, unfollowPerson } from "../api/peopleApi";
import ErrorBanner from "../ErrorBanner";
import Modal from "../Modal";
import { pictureSrc } from "../pictures";

// Following people (2026-11-23, item 6; the phone's features/people in the web app's look): the Follow button, a
// person's row, and the followers / following dialog a profile's counts open. Following works at once; the button
// shows the new state as soon as it's clicked and goes back if the server says no.

const initials = (name) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return w.length === 0 ? "?" : w.length === 1 ? w[0].slice(0, 2) : (w[0][0] + w[1][0]);
};

const pill = (on, theme) => ({
  minHeight: 36,
  borderRadius: 999,
  padding: "0 14px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  flex: "none",
  border: on ? `1.5px solid ${theme.deep}` : "none",
  background: on ? "transparent" : theme.deep,
  color: on ? theme.accent : theme.cream,
});

/** Follow / Following / Follow back. Clicking Following stops following. */
export function FollowButton({ userId, name, state, theme, onChanged }) {
  const [following, setFollowing] = useState(null);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const on = following ?? state.isFollowing;

  const toggle = async () => {
    if (busy.current) return;
    busy.current = true;
    const next = !on;
    setFollowing(next);
    setError("");
    try {
      const res = await (next ? followPerson(userId) : unfollowPerson(userId));
      setFollowing(res.follow.isFollowing);
      onChanged?.(res.follow);
    } catch (e) {
      setFollowing(!next);
      setError(e.message);
    } finally {
      busy.current = false;
    }
  };

  const label = on ? "✓ Following" : state.followsMe ? "+ Follow back" : "+ Follow";
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button type="button" onClick={toggle} style={pill(on, theme)} aria-label={on ? `Following ${name}. Click to stop following` : `${label.slice(2)} ${name}`}>
        {label}
      </button>
      {error && (
        <span role="alert" style={{ fontSize: 12, color: theme.muted }}>
          {error}
        </span>
      )}
    </span>
  );
}

export function Avatar({ name, photoUrl, theme, size = 40 }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, borderRadius: "50%", flex: "none", overflow: "hidden", display: "grid", placeItems: "center", background: theme.tint, color: theme.deep, fontWeight: 700, fontSize: size * 0.36 }}
    >
      {photoUrl ? <img src={pictureSrc(photoUrl)} alt="" width={size} height={size} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(name)}
    </span>
  );
}

/** One person: the name opens their profile; the button follows; Remove (your own followers) stops them following you. */
export function PersonRow({ person, theme, onOpen, onRemove, removing }) {
  const sub = [person.followsMe && !person.isFollowing ? "Follows you" : null, person.line].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${theme.cardDivider ?? "var(--hair)"}` }}>
      <button
        type="button"
        onClick={onOpen}
        style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit", minHeight: 44 }}
      >
        <Avatar name={person.name} photoUrl={person.photoUrl} theme={theme} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {person.name}
            {person.isMe ? " (you)" : ""}
          </span>
          {sub && <span style={{ display: "block", fontSize: 13, color: theme.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
        </span>
      </button>
      {!person.isMe && <FollowButton userId={person.userId} name={person.name} state={person} theme={theme} />}
      {onRemove && (
        <button type="button" onClick={onRemove} disabled={removing} style={{ ...pill(true, theme), borderColor: "var(--line)", color: theme.muted }}>
          {removing ? "Removing…" : "Remove"}
        </button>
      )}
    </div>
  );
}

/** Someone's followers and the people they follow; on your own followers, Remove (they aren't told). */
export function FollowListDialog({ userId, initialTab, theme, onClose, onOpenPerson }) {
  const [tab, setTab] = useState(initialTab);
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setList(await (tab === "followers" ? getFollowers(userId) : getFollowing(userId)));
    } catch (e) {
      setError(e.message);
    }
  }, [tab, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const remove = async (person) => {
    if (!window.confirm(`Remove ${person.name} as a follower?\n\nThey stop hearing about your matches and aren't told. They can follow you again later.`)) return;
    setRemoving(person.userId);
    try {
      setList(await removeFollower(person.userId));
    } catch (e) {
      setError(e.message);
    } finally {
      setRemoving(null);
    }
  };

  const tabStyle = (on) => ({ flex: 1, minHeight: 44, background: "none", border: "none", borderBottom: `2px solid ${on ? theme.accent : "transparent"}`, fontWeight: on ? 700 : 500, color: on ? theme.ink : theme.muted, cursor: "pointer", font: "inherit" });
  return (
    <Modal labelledBy="follow-list-title" onClose={onClose} panelStyle={{ background: theme.cream, color: theme.ink, borderRadius: 14, padding: "1.2rem", display: "flex", flexDirection: "column", gap: 10, width: "min(480px, 100%)", maxHeight: "85vh", overflow: "auto" }}>
      <h2 id="follow-list-title" style={{ margin: 0, fontSize: 18 }}>{list?.name ?? "…"}</h2>
      <div role="tablist" style={{ display: "flex", borderBottom: "1px solid var(--hair)" }}>
        {["followers", "following"].map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t === "followers" ? "Followers" : "Following"}
            {list ? ` · ${t === "followers" ? list.followers : list.following}` : ""}
          </button>
        ))}
      </div>
      <ErrorBanner message={error} />
      {!list ? (
        !error && <p style={{ color: theme.muted, margin: 0 }}>Loading…</p>
      ) : list.items.length === 0 ? (
        <p style={{ color: theme.muted, margin: 0 }}>
          {tab === "followers" ? (list.isMine ? "When someone follows you, they show up here." : `Nobody follows ${list.name} yet.`) : list.isMine ? "Find people under Find tournaments and people on Home." : `${list.name} doesn't follow anyone yet.`}
        </p>
      ) : (
        <div>
          {list.items.map((p) => (
            <PersonRow
              key={p.userId}
              person={p}
              theme={theme}
              onOpen={() => onOpenPerson(p.userId)}
              onRemove={list.isMine && tab === "followers" ? () => remove(p) : undefined}
              removing={removing === p.userId}
            />
          ))}
        </div>
      )}
      <button type="button" onClick={onClose} style={{ ...pill(true, theme), alignSelf: "flex-end" }}>
        Close
      </button>
    </Modal>
  );
}
