import { useEffect, useRef, useState } from "react";
import {
  deleteAccount,
  getAccount,
  previewAccountDeletion,
  removeContact,
  sendContactCode,
  signOut,
  signOutEverywhere,
  updateAccount,
  verifyContact,
} from "./api/accountApi";
import { clearSession, updateSessionUser } from "./auth/session";
import ErrorBanner from "./ErrorBanner";
import { font, footballTheme as theme } from "./theme";
import { formatPhone, useAuthOptions } from "./useAuthOptions";
import {
  BATTING_STYLES,
  BOWLING_ARMS,
  BOWLING_TYPES,
  CRICKET_ROLES,
  cricketDraftFrom,
  cricketPayload,
  roleBowls,
} from "./cricket/cricketLabels";

// The signed-in person's account: their name and cricket profile (both copied to every team place
// linked to them), the email and mobile number they sign in with, signing out — of this browser, or
// of every device at once (for a lost phone) — and deleting the account, confirmed with a code sent
// to them.

const button = {
  minHeight: 44,
  border: "none",
  borderRadius: 8,
  padding: "0.6rem 1.2rem",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const field = { padding: "0.6rem 0.8rem", borderRadius: 8, border: "1.5px solid #d8d4c8", fontSize: 14, background: "#fff", color: "#1B1B1B" };
const card = { background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem", marginBottom: 16 };
const label = { display: "block", fontSize: 14, fontWeight: 600, color: theme.muted, marginBottom: 8 };

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function Account({ onBack, backLabel = "Your tournaments" }) {
  const [account, setAccount] = useState(null);
  const [name, setName] = useState("");
  const [cricket, setCricket] = useState(cricketDraftFrom(null));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState("");
  const [deletion, setDeletion] = useState(null); // the preview, once asked for
  const [code, setCode] = useState("");
  const inFlight = useRef(false);

  const show = (a) => {
    setAccount(a);
    setName(a.name);
    setCricket(cricketDraftFrom(a.cricket));
  };

  useEffect(() => {
    let live = true;
    getAccount()
      .then((a) => live && show(a))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);

  const run = async (what, action) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(what);
    setError("");
    setSaved(false);
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      inFlight.current = false;
      setBusy("");
    }
  };

  // Unchanged cricket fields aren't sent, so someone who never plays cricket never gets a profile.
  const cricketChanged = account && JSON.stringify(cricket) !== JSON.stringify(cricketDraftFrom(account.cricket));
  const changed = account && (name.trim() !== account.name || cricketChanged);

  const save = (e) => {
    e.preventDefault();
    run("save", async () => {
      const updated = await updateAccount(name.trim(), cricketChanged ? cricketPayload(cricket) : undefined);
      show(updated);
      updateSessionUser({ name: updated.name });
      setSaved(true);
    });
  };

  // Signed out locally even if the server can't be told: the button must always work.
  const leave = () =>
    run("out", async () => {
      try {
        await signOut();
      } finally {
        clearSession();
      }
    });

  const leaveEverywhere = () => {
    if (!window.confirm("Sign out on every device, including this one? You'll need a new code on each.")) return;
    run("all", async () => {
      await signOutEverywhere();
      clearSession();
    });
  };

  const askToDelete = () =>
    run("preview", async () => {
      setDeletion(await previewAccountDeletion());
      setCode("");
    });

  const confirmDelete = (e) => {
    e.preventDefault();
    if (!window.confirm("Delete your account for good? This can't be undone.")) return;
    run("delete", async () => {
      await deleteAccount(code.trim());
      clearSession(); // every session has ended; back to sign-in
    });
  };

  const setC = (key, value) => {
    setCricket((c) => ({ ...c, [key]: value }));
    setSaved(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.background, fontFamily: font.body, color: theme.onDark, paddingBottom: "4rem" }}>
      <header style={{ padding: "2.5rem clamp(1rem, 4vw, 2rem) 2rem", borderBottom: `3px solid ${theme.borderOnDark}` }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: theme.onDarkMuted, cursor: "pointer", fontSize: 14, padding: 0, minHeight: 44 }}>
            ← {backLabel}
          </button>
          <h1 style={{ fontFamily: font.display, fontSize: "clamp(2rem, 8vw, 3rem)", margin: "0.2rem 0 0", lineHeight: 1 }}>ACCOUNT</h1>
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "2rem clamp(1rem, 4vw, 2rem)" }}>
        <ErrorBanner message={error} />

        {!account && !error && <p style={{ color: theme.onDarkMuted }}>Loading…</p>}

        {account && (
          <>
            <form onSubmit={save} style={card}>
              <label htmlFor="account-name" style={label}>
                Name
              </label>
              <input
                id="account-name"
                value={name}
                maxLength={100}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                disabled={!!busy}
                style={{ ...field, width: "100%", boxSizing: "border-box" }}
              />

              <fieldset disabled={!!busy} style={{ border: "none", padding: 0, margin: "1.2rem 0 0" }}>
                <legend style={{ ...label, marginBottom: 4 }}>Cricket profile</legend>
                <p style={{ fontSize: 12, color: theme.muted, margin: "0 0 8px" }}>
                  Used in every cricket team you're linked to. Leave it if you only play football.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select aria-label="Role" value={cricket.primaryRole} onChange={(e) => setC("primaryRole", e.target.value)} style={field}>
                    {CRICKET_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <select aria-label="Batting style" value={cricket.battingStyle} onChange={(e) => setC("battingStyle", e.target.value)} style={field}>
                    <option value="">Batting style…</option>
                    {BATTING_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {roleBowls(cricket.primaryRole) && (
                    <>
                      <select aria-label="Bowling arm" value={cricket.bowlingArm} onChange={(e) => setC("bowlingArm", e.target.value)} style={field}>
                        <option value="">Arm…</option>
                        {BOWLING_ARMS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                      <select aria-label="Bowling type" value={cricket.bowlingType} onChange={(e) => setC("bowlingType", e.target.value)} style={field}>
                        <option value="">Type…</option>
                        {BOWLING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </>
                  )}
                  <input
                    aria-label="Usual batting position"
                    title="Usual position in the batting order"
                    placeholder="Bat #"
                    type="number"
                    min="1"
                    max="11"
                    value={cricket.battingOrderPreference}
                    onChange={(e) => setC("battingOrderPreference", e.target.value)}
                    style={{ ...field, width: 80 }}
                  />
                </div>
              </fieldset>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
                <button type="submit" disabled={!changed || !!busy} style={{ ...button, background: theme.accent, color: theme.accentInk, opacity: changed ? 1 : 0.5 }}>
                  {busy === "save" ? "Saving…" : "Save"}
                </button>
                {saved && <span style={{ color: theme.successInk, fontSize: 14 }}>Saved.</span>}
              </div>

              <dl style={{ margin: "1.2rem 0 0", fontSize: 14, display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px" }}>
                <dt style={{ color: theme.muted }}>Member since</dt>
                <dd style={{ margin: 0 }}>{new Date(account.memberSince.endsWith("Z") ? account.memberSince : `${account.memberSince}Z`).toLocaleDateString()}</dd>
              </dl>
            </form>

            <SignInMethods account={account} onSaved={show} />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
              <button onClick={leave} disabled={!!busy} style={{ ...button, background: theme.cream, color: theme.ink }}>
                {busy === "out" ? "Signing out…" : "Sign out"}
              </button>
              <button onClick={leaveEverywhere} disabled={!!busy} style={{ ...button, background: "transparent", color: theme.onDark, border: `1.5px solid ${theme.borderOnDark}` }}>
                {busy === "all" ? "Signing out…" : "Sign out on all devices"}
              </button>
            </div>

            {account.canDelete && !deletion && (
              <button onClick={askToDelete} disabled={!!busy} style={{ ...button, background: "transparent", color: theme.onDarkMuted, border: `1.5px solid ${theme.borderOnDark}` }}>
                {busy === "preview" ? "Checking…" : "Delete account…"}
              </button>
            )}

            {deletion && (
              <form onSubmit={confirmDelete} style={{ ...card, borderLeft: `4px solid ${theme.dangerSolid}` }}>
                <h2 style={{ fontFamily: font.display, fontSize: 22, margin: "0 0 8px" }}>DELETE YOUR ACCOUNT</h2>
                <p style={{ fontSize: 14, margin: "0 0 8px", lineHeight: 1.5 }}>This can't be undone. Deleting it:</p>
                <ul style={{ fontSize: 14, margin: "0 0 12px", paddingLeft: 20, lineHeight: 1.6 }}>
                  {deletion.tournamentsDeleted.map((t) => (
                    <li key={t.id}>
                      <strong>deletes {t.name}</strong>, which only you own
                      {t.otherPeople > 0 && <> — for the {plural(t.otherPeople, "other person", "other people")} in it too</>}
                    </li>
                  ))}
                  {deletion.tournamentsHandedOver.map((t) => (
                    <li key={t.id}>hands {t.name} to {t.newCreator}</li>
                  ))}
                  {deletion.tournamentsLeft > 0 && <li>takes you off {plural(deletion.tournamentsLeft, "other tournament", "other tournaments")}</li>}
                  {deletion.squadPlaces > 0 && (
                    <li>unlinks you from {plural(deletion.squadPlaces, "team", "teams")} (your name stays on past scorecards)</li>
                  )}
                  <li>removes your name, email, mobile number and cricket profile, and signs you out everywhere</li>
                </ul>
                <label htmlFor="delete-code" style={label}>
                  Code sent to {deletion.codeSentTo}
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    id="delete-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    disabled={!!busy}
                    style={{ ...field, flex: "1 1 140px", letterSpacing: "0.2em" }}
                  />
                  <button type="submit" disabled={code.length !== 6 || !!busy} style={{ ...button, background: theme.dangerSolid, color: "#fff", opacity: code.length === 6 ? 1 : 0.5 }}>
                    {busy === "delete" ? "Deleting…" : "Delete my account"}
                  </button>
                </div>
                <button type="button" onClick={() => setDeletion(null)} disabled={!!busy} style={{ ...button, background: "transparent", color: theme.muted, padding: "0.6rem 0", marginTop: 8 }}>
                  Keep my account
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/**
 * How they sign in: an email, a mobile number or both. Adding or changing one sends a code to the
 * new address, and only the code saves it. Remove is offered only where the server allows it (an
 * account keeps one way in; an admin keeps their email). The number row appears once the server
 * can text codes, or when the account already has one.
 */
function SignInMethods({ account, onSaved }) {
  const options = useAuthOptions();
  const [editing, setEditing] = useState(null); // "Email" | "Phone"
  const [value, setValue] = useState("");
  const [sentTo, setSentTo] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const run = async (action) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const open = (kind) => {
    setEditing(kind);
    setValue("");
    setSentTo(null);
    setCode("");
    setError("");
  };

  const saved = (a) => {
    onSaved(a);
    updateSessionUser({ email: a.email, phone: a.phone });
    setEditing(null);
  };

  const send = (e) => {
    e.preventDefault();
    run(async () => {
      const sent = await sendContactCode(value.trim());
      setSentTo(sent.sentTo);
      setCode("");
    });
  };

  const confirmCode = (e) => {
    e.preventDefault();
    run(async () => saved(await verifyContact(sentTo, code)));
  };

  const remove = (kind, shown) => {
    if (!window.confirm(`Remove ${shown}? You won't be able to sign in with it any more.`)) return;
    run(async () => saved(await removeContact(kind)));
  };

  const rows = [
    { kind: "Email", label: "Email", value: account.email, canRemove: account.canRemoveEmail },
    ...(options.phone || account.phone
      ? [{ kind: "Phone", label: "Mobile number", value: account.phone ? formatPhone(account.phone) : null, canRemove: account.canRemovePhone }]
      : []),
  ];
  const small = { ...button, minHeight: 36, padding: "0.4rem 0.9rem", fontSize: 13 };

  return (
    <section style={card} aria-labelledby="signin-methods">
      <h2 id="signin-methods" style={{ ...label, fontSize: 15, color: theme.ink, margin: "0 0 2px" }}>How you sign in</h2>
      <p style={{ fontSize: 12, color: theme.muted, margin: "0 0 10px" }}>
        {rows.length > 1 ? "A code goes to either one. Only you see them." : "Your sign-in codes go here. Only you see it."}
      </p>
      {!editing && <ErrorBanner message={error} />}

      {rows.map((row) => (
        <div key={row.kind} style={{ borderTop: "1px solid #e4dfd2", padding: "10px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px", minWidth: 0 }}>
              <div style={{ fontSize: 12, color: theme.muted, fontWeight: 600 }}>{row.label}</div>
              <div style={{ fontSize: 14, overflowWrap: "anywhere", color: row.value ? theme.ink : theme.muted }}>{row.value ?? "Not added"}</div>
            </div>
            {editing !== row.kind && (
              <div style={{ display: "flex", gap: 8 }}>
                {row.canRemove && (
                  <button type="button" onClick={() => remove(row.kind, row.value)} disabled={busy} style={{ ...small, background: "transparent", color: theme.muted, border: "1.5px solid #d8d4c8" }}>
                    Remove
                  </button>
                )}
                <button type="button" onClick={() => open(row.kind)} disabled={busy} style={{ ...small, background: theme.ink, color: theme.cream }}>
                  {row.value ? "Change" : "Add"}
                </button>
              </div>
            )}
          </div>

          {editing === row.kind && (
            <form onSubmit={sentTo ? confirmCode : send} style={{ marginTop: 10 }}>
              <ErrorBanner message={error} />
              <label htmlFor={`contact-${row.kind}`} style={{ ...label, fontSize: 13 }}>
                {sentTo ? `Code sent to ${row.kind === "Email" ? sentTo : formatPhone(sentTo)}` : row.kind === "Email" ? "New email" : "New mobile number"}
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {sentTo ? (
                  <input
                    id={`contact-${row.kind}`}
                    key="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    autoFocus
                    disabled={busy}
                    style={{ ...field, flex: "1 1 140px", letterSpacing: "0.2em" }}
                  />
                ) : (
                  <input
                    id={`contact-${row.kind}`}
                    key="value"
                    type={row.kind === "Email" ? "email" : "tel"}
                    autoComplete={row.kind === "Email" ? "email" : "tel"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={row.kind === "Email" ? "you@example.com" : "98765 43210"}
                    autoFocus
                    disabled={busy}
                    style={{ ...field, flex: "1 1 200px" }}
                  />
                )}
                <button
                  type="submit"
                  disabled={busy || (sentTo ? code.length !== 6 : !value.trim())}
                  style={{ ...button, background: theme.accent, color: theme.accentInk, opacity: (sentTo ? code.length === 6 : value.trim()) ? 1 : 0.5 }}
                >
                  {busy ? "Working…" : sentTo ? (row.value ? "Change" : "Add") : "Send code"}
                </button>
              </div>
              {!sentTo && (
                <p style={{ fontSize: 12, color: theme.muted, margin: "6px 2px 0" }}>
                  {row.kind === "Email" ? "We'll email it a code." : `We'll text it a code. Without a country code it's taken as ${options.defaultCountryCode}.`}
                </p>
              )}
              <button type="button" onClick={() => setEditing(null)} disabled={busy} style={{ ...button, background: "transparent", color: theme.muted, padding: "0.4rem 0", minHeight: 36 }}>
                Cancel
              </button>
            </form>
          )}
        </div>
      ))}
    </section>
  );
}
