import Mark from "./Mark";
import NotificationBell from "../NotificationBell";
import { useSession } from "../auth/useSession";
import { BackIcon, SearchIcon } from "./icons";
import { pictureSrc } from "../pictures";

// The slim bar on every page (2026-11-26, the canvas's web boards): the app's mark and name, where
// you are, search, the inbox and your profile. Glass buttons in dark, outlined ones in light; on a
// phone only the mark, the crumb's last part and the round buttons stay. Signed out (the public
// pages) it offers "Sign in" instead of the inbox and profile.

function initials(name) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * crumb: [{ label, onClick? }] after the name; the last is where you are.
 * back: a Back button in place of the mark (screens that are a step inside another).
 * children: extra controls before search (a screen's own actions).
 * signIn: false when the page offers its own way in (the public page's "Sign in to follow").
 */
export default function TopBar({ crumb = [], onHome, back, backLabel = "Back", onFind, onInbox, onProfile, signIn = true, children }) {
  const session = useSession();
  const home = () => (onHome ? onHome() : window.location.assign("/"));
  return (
    <header className="kc-bar">
      <div className="kc-wrap">
        {back ? (
          <button type="button" className="kc-ib kc-glass" aria-label={backLabel} title={backLabel} onClick={back}>
            <BackIcon />
          </button>
        ) : null}
        <button type="button" className={`kc-brand${back ? " kc-desk-only" : ""}`} onClick={home} aria-label="KickCricket, your tournaments">
          <Mark />
          <span className="kc-desk-only">KickCricket</span>
        </button>
        {crumb.length > 0 && (
          <nav className="kc-crumb" aria-label="You are here">
            {crumb.map((c, i) => {
              const last = i === crumb.length - 1;
              return (
                <span key={i} className={last ? undefined : "kc-desk-only"} style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span aria-hidden="true" className="kc-desk-only">/</span>
                  {last ? (
                    <b aria-current="page">{c.label}</b>
                  ) : c.onClick ? (
                    <button type="button" onClick={c.onClick}>{c.label}</button>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </span>
              );
            })}
          </nav>
        )}
        <span className="kc-grow" />
        {children}
        {session ? (
          <>
            {onFind && (
              <button type="button" className="kc-find kc-glass kc-desk-only" onClick={onFind}>
                <SearchIcon /> Find tournaments and people
              </button>
            )}
            {onFind && (
              <button type="button" className="kc-ib kc-glass kc-phone-only" aria-label="Find tournaments and people" onClick={onFind}>
                <SearchIcon />
              </button>
            )}
            {onInbox && <NotificationBell onOpen={onInbox} />}
            {onProfile && (
              <button type="button" className="kc-ib kc-glass" aria-label="Your profile" title={session.user?.name ?? "Your profile"} onClick={onProfile}>
                <span className="kc-avatar">{session.user?.photoUrl ? <img src={pictureSrc(session.user.photoUrl)} alt="" onError={(e) => e.currentTarget.replaceWith(document.createTextNode(initials(session.user?.name)))} /> : initials(session.user?.name)}</span>
              </button>
            )}
          </>
        ) : signIn ? (
          <a className="kc-btn sm sec" href="/">
            Sign in
          </a>
        ) : null}
      </div>
    </header>
  );
}
