import { useEffect, useRef, useState } from "react";
import { deleteAccount, getAccount, previewAccountDeletion, signOut, signOutEverywhere, updateAccount } from "./api/accountApi";
import { clearSession, updateSessionUser } from "./auth/session";
import ErrorBanner from "./ErrorBanner";
import { font, footballTheme as theme } from "./theme";
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
// linked to them), email, signing out — of this browser, or of every device at once (for a lost
// phone) — and deleting the account, confirmed with a code emailed to them.

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

export default function Account({ onBack }) {
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
            ← Your tournaments
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
                <dt style={{ color: theme.muted }}>Email</dt>
                <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{account.email}</dd>
                <dt style={{ color: theme.muted }}>Member since</dt>
                <dd style={{ margin: 0 }}>{new Date(account.memberSince.endsWith("Z") ? account.memberSince : `${account.memberSince}Z`).toLocaleDateString()}</dd>
              </dl>
            </form>

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
                  <li>removes your name, email and cricket profile, and signs you out everywhere</li>
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
