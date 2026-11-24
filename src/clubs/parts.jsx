import ErrorBanner from "../ErrorBanner";
import { font } from "../theme";
import { pictureSrc } from "../pictures";

// Shared pieces of the lasting-team screens (people see "team"; the API says club): the page shell in the web app's
// floodlit look, cream cards, buttons, and one guarded runner per screen so a double click can't send twice.

/** The dark page with its header: a back link, an eyebrow and a title. */
export function Page({ theme, back, onBack, eyebrow, title, logo, logoName, children, width = 720 }) {
  return (
    <div style={{ minHeight: "100vh", background: theme.background, fontFamily: font.body, color: theme.onDark, paddingBottom: "4rem" }}>
      <header style={{ padding: "2.2rem clamp(1rem, 4vw, 2rem) 1.6rem", borderBottom: `3px solid ${theme.borderOnDark}` }}>
        <div style={{ maxWidth: width, margin: "0 auto" }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", color: theme.onDarkMuted, cursor: "pointer", fontSize: 14, padding: 0, minHeight: 44 }}>
              ← {back}
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
            {logo !== undefined && <Logo link={logo} name={logoName ?? title} size={60} theme={theme} />}
            <div style={{ minWidth: 0 }}>
              {eyebrow && <p style={{ margin: 0, color: theme.onDarkMuted, fontSize: 14 }}>{eyebrow}</p>}
              <h1 style={{ fontFamily: font.display, fontSize: "clamp(1.8rem, 7vw, 2.6rem)", margin: "0.1rem 0 0", lineHeight: 1.05, overflowWrap: "anywhere" }}>
                {title?.toUpperCase()}
              </h1>
            </div>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: width, margin: "0 auto", padding: "1.6rem clamp(1rem, 4vw, 2rem)", display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </main>
    </div>
  );
}

export function Card({ theme, children, style }) {
  return <section style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.1rem 1.2rem", display: "flex", flexDirection: "column", gap: 10, ...style }}>{children}</section>;
}

export function Heading({ theme, children }) {
  return <h2 style={{ fontFamily: font.condensed, fontSize: 17, letterSpacing: "0.18em", color: theme.onDarkMuted, margin: "8px 0 0", fontWeight: 600 }}>{children}</h2>;
}

/** A team's logo, or its initials on a tinted square. */
export function Logo({ link, name, size = 40, theme }) {
  // A short single word (a league's "CPL") shows as it is; a name shows its initials.
  const initials = /^\S{1,4}$/.test(name ?? "") ? name.toUpperCase() : (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return link ? (
    <img src={pictureSrc(link)} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: size / 5, objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size / 5, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: theme.surfaceOnDark, border: `1px solid ${theme.borderOnDark}`, color: theme.onDark, fontWeight: 700, fontSize: size / 2.8 }}>
      {initials}
    </span>
  );
}

export function Errors({ message }) {
  return <ErrorBanner message={message} />;
}

/** A tickable row (squad picks, the live-tournaments question). A greyed one shows the server's reason. */
export function Tick({ theme, on, reason, onToggle, title, detail }) {
  return (
    <label style={{ display: "flex", gap: 12, alignItems: "center", minHeight: 48, padding: "6px 0", borderBottom: "1px solid #e4e0d4", opacity: reason ? 0.55 : 1, cursor: reason ? "default" : "pointer" }}>
      <input type="checkbox" checked={!reason && on} disabled={!!reason} onChange={onToggle} style={{ width: 20, height: 20, accentColor: theme.successInk }} />
      <span style={{ display: "flex", flexDirection: "column" }}>
        <strong style={{ fontWeight: 600 }}>{title}</strong>
        {(reason || detail) && <span style={{ fontSize: 13, color: theme.muted }}>{reason ?? detail}</span>}
      </span>
    </label>
  );
}

