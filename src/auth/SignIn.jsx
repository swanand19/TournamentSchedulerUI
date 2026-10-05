import { useEffect, useRef, useState } from "react";
import { sendCode, verifyCode } from "../api/accountApi";
import ErrorBanner from "../ErrorBanner";
import { font, footballTheme as theme } from "../theme";
import { getSignedOutReason, setSession } from "./session";

// Sign in and sign up are one flow: email → the 6-digit code we email → (new emails only) a name.
// There is no password. The server decides everything — whether the email is new, how many tries
// are left, how long to wait before another code — and its messages are shown as they come.

const CODE_LENGTH = 6;

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "0.75rem 0.9rem",
  borderRadius: 8,
  border: "1.5px solid #d8d4c8",
  fontSize: 16,
  fontFamily: font.body,
};

const primaryButton = (busy) => ({
  width: "100%",
  minHeight: 48,
  marginTop: 14,
  background: theme.accent,
  color: theme.accentInk,
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 15,
  cursor: busy ? "wait" : "pointer",
  opacity: busy ? 0.75 : 1,
});

const linkButton = {
  background: "none",
  border: "none",
  color: theme.muted,
  textDecoration: "underline",
  cursor: "pointer",
  fontSize: 14,
  padding: "0.5rem 0",
  minHeight: 44,
};

export default function SignIn() {
  const [step, setStep] = useState("email"); // email | code | name
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(getSignedOutReason());
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);

  // A countdown for "Send a new code", only while it matters.
  useEffect(() => {
    if (step !== "code" || now >= resendAt) return undefined;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [step, now, resendAt]);

  // One request at a time: a double tap must not send two codes or spend two tries.
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

  const requestCode = () =>
    run(async () => {
      const sent = await sendCode(email.trim());
      setEmail(sent.email);
      setCode("");
      setResendAt(Date.now() + sent.resendAfterSeconds * 1000);
      setNow(Date.now());
      setStep("code");
    });

  const finish = (result) => {
    setSession({
      token: result.sessionToken,
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
      user: result.user,
    });
  };

  const submitCode = () =>
    run(async () => {
      const result = await verifyCode(email, code.replace(/\s/g, ""));
      if (result.outcome === "NeedsName") setStep("name");
      else finish(result);
    });

  const submitName = () =>
    run(async () => {
      finish(await verifyCode(email, code.replace(/\s/g, ""), name.trim()));
    });

  const onSubmit = (e) => {
    e.preventDefault();
    if (step === "email") requestCode();
    else if (step === "code") submitCode();
    else submitName();
  };

  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  return (
    <div style={{ minHeight: "100vh", background: theme.background, fontFamily: font.body, color: theme.onDark, padding: "0 clamp(1rem, 4vw, 2rem)" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", paddingTop: "clamp(2.5rem, 10vh, 6rem)" }}>
        <p style={{ fontFamily: font.condensed, fontSize: 18, letterSpacing: "0.35em", color: theme.accent, margin: 0, fontWeight: 600 }}>
          MATCHDAY SCHEDULER
        </p>
        <h1 style={{ fontFamily: font.display, fontSize: "clamp(2rem, 8vw, 2.8rem)", margin: "0.2rem 0 1.6rem", lineHeight: 1 }}>
          {step === "name" ? "WELCOME" : "SIGN IN"}
        </h1>

        <ErrorBanner message={error} />

        <form onSubmit={onSubmit} noValidate style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.4rem" }}>
          {step === "email" && (
            <>
              <label htmlFor="signin-email" style={{ display: "block", fontSize: 14, fontWeight: 600, color: theme.muted, marginBottom: 8 }}>
                Your email
              </label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={busy}
                style={inputStyle}
              />
              <p style={{ fontSize: 13, color: theme.muted, margin: "10px 2px 0", lineHeight: 1.5 }}>
                We'll email you a {CODE_LENGTH}-digit code. New here? The same code creates your account.
              </p>
              <button type="submit" disabled={busy} style={primaryButton(busy)}>
                {busy ? "Sending…" : "Send code"}
              </button>
            </>
          )}

          {step === "code" && (
            <>
              <label htmlFor="signin-code" style={{ display: "block", fontSize: 14, fontWeight: 600, color: theme.muted, marginBottom: 8 }}>
                Code sent to {email}
              </label>
              <input
                id="signin-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={CODE_LENGTH + 1}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder="123456"
                disabled={busy}
                style={{ ...inputStyle, fontSize: 24, letterSpacing: "0.3em", textAlign: "center", fontFamily: font.condensed }}
              />
              <p style={{ fontSize: 13, color: theme.muted, margin: "10px 2px 0", lineHeight: 1.5 }}>
                It works for 5 minutes. Check your spam folder if it hasn't arrived.
              </p>
              <button type="submit" disabled={busy} style={primaryButton(busy)}>
                {busy ? "Checking…" : "Sign in"}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                <button type="button" style={linkButton} disabled={busy} onClick={() => { setStep("email"); setError(""); }}>
                  Use a different email
                </button>
                <button
                  type="button"
                  style={{ ...linkButton, cursor: waitSeconds > 0 ? "default" : "pointer" }}
                  disabled={busy || waitSeconds > 0}
                  onClick={requestCode}
                >
                  {waitSeconds > 0 ? `New code in ${waitSeconds}s` : "Send a new code"}
                </button>
              </div>
            </>
          )}

          {step === "name" && (
            <>
              <label htmlFor="signin-name" style={{ display: "block", fontSize: 14, fontWeight: 600, color: theme.muted, marginBottom: 8 }}>
                Your name
              </label>
              <input
                id="signin-name"
                autoComplete="name"
                autoFocus
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="As teammates know you"
                disabled={busy}
                style={inputStyle}
              />
              <p style={{ fontSize: 13, color: theme.muted, margin: "10px 2px 0", lineHeight: 1.5 }}>
                {email} is new here — this creates your account.
              </p>
              <button type="submit" disabled={busy} style={primaryButton(busy)}>
                {busy ? "Creating…" : "Create account"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
