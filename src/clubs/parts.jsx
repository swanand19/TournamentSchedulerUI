import ErrorBanner from "../ErrorBanner";
import { BackIcon } from "../ui/icons";
import { pictureSrc } from "../pictures";

// Shared pieces of the lasting-team and league screens (people see "team"; the API says club): the page shell,
// panes, buttons, and one guarded runner per screen so a double click can't send twice.

/** A page in the frame (2026-11-26): a Back link, an eyebrow and a title, then the content. */
export function Page({ back, onBack, eyebrow, title, logo, logoName, children, width = 720, theme }) {
  return (
    <main className="kc-wrap kc-main" style={{ maxWidth: width + 80 }}>
      {onBack && (
        <button type="button" className="kc-link" onClick={onBack} style={{ minHeight: 40, fontWeight: 500 }}>
          <BackIcon size={18} /> {back}
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
        {logo !== undefined && <Logo link={logo} name={logoName ?? title} size={60} theme={theme} />}
        <div style={{ minWidth: 0 }}>
          {eyebrow && <p className="kc-sub" style={{ margin: 0 }}>{eyebrow}</p>}
          <h1 className="kc-title">{title}</h1>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>{children}</div>
    </main>
  );
}

/** A group of content: a frosted pane in dark, an open section under a hairline in light. */
export function Card({ children, style }) {
  return (
    <section className="kc-pane lined flush" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, ...style }}>
      {children}
    </section>
  );
}

export function Heading({ children }) {
  return <h2 className="kc-h2" style={{ margin: "10px 0 0" }}>{children}</h2>;
}

/** A team's logo, or its initials on a tinted square. */
export function Logo({ link, name, size = 40 }) {
  // A short single word (a league's "CPL") shows as it is; a name shows its initials.
  const initials = /^\S{1,4}$/.test(name ?? "") ? name : (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("");
  return link ? (
    <img src={pictureSrc(link)} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: size / 4, objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <span className="kc-initials" aria-hidden="true" style={{ width: size, height: size, borderRadius: size / 4, fontSize: size / 2.8 }}>
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
    <label style={{ display: "flex", gap: 12, alignItems: "center", minHeight: 48, padding: "6px 0", borderBottom: "1px solid var(--hair)", opacity: reason ? 0.55 : 1, cursor: reason ? "default" : "pointer" }}>
      <input type="checkbox" checked={!reason && on} disabled={!!reason} onChange={onToggle} style={{ width: 20, height: 20, accentColor: theme.successInk }} />
      <span style={{ display: "flex", flexDirection: "column" }}>
        <strong style={{ fontWeight: 600 }}>{title}</strong>
        {(reason || detail) && <span style={{ fontSize: 13, color: theme.muted }}>{reason ?? detail}</span>}
      </span>
    </label>
  );
}

