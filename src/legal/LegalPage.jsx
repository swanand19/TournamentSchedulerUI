import { useEffect } from "react";
import { font, footballTheme as t } from "../theme";

// The two pages Google Play asks every app to link to: the privacy policy (/privacy) and how to delete
// an account (/delete-account). Public and outside the sign-in gate (main.jsx), like /live/<code>,
// because people read them before they have an account — or after they've lost access to it.
//
// Plain words about what the app really does; when a feature changes what is kept or who sees it,
// change this page in the same release. The facts behind each line are in docs/LLD (tables, retention).

const APP = import.meta.env.VITE_APP_NAME || "KickCricket";
const CONTACT = import.meta.env.VITE_CONTACT_EMAIL || "";
const UPDATED = "23 November 2026";

export default function LegalPage() {
  const page = window.location.pathname.startsWith("/delete-account") ? "delete" : "privacy";

  useEffect(() => {
    document.title = page === "delete" ? `Delete your account · ${APP}` : `Privacy policy · ${APP}`;
  }, [page]);

  return (
    <div style={{ minHeight: "100vh", background: t.background, padding: "32px 16px 64px", fontFamily: font.body }}>
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: t.cream,
          color: t.ink,
          borderRadius: 16,
          padding: "28px clamp(18px, 5vw, 40px)",
          lineHeight: 1.6,
          fontSize: 16,
        }}
      >
        <nav style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14, marginBottom: 20 }}>
          <a href="/privacy" style={link(page === "privacy")} aria-current={page === "privacy" ? "page" : undefined}>
            Privacy policy
          </a>
          <a href="/delete-account" style={link(page === "delete")} aria-current={page === "delete" ? "page" : undefined}>
            Delete your account
          </a>
          <a href="/" style={link(false)}>
            Open {APP}
          </a>
        </nav>
        {page === "delete" ? <DeleteAccount /> : <Privacy />}
        <p style={{ color: t.muted, fontSize: 14, marginTop: 32 }}>Last updated {UPDATED}.</p>
      </main>
    </div>
  );
}

const link = (current) => ({
  color: t.deep,
  fontWeight: current ? 700 : 500,
  textDecoration: current ? "none" : "underline",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
});

const h1 = { fontFamily: font.display, fontWeight: 400, fontSize: "clamp(30px, 6vw, 40px)", lineHeight: 1.1, margin: "0 0 12px" };
const h2 = { fontSize: 19, fontWeight: 700, margin: "28px 0 6px" };

function Contact({ subject }) {
  if (!CONTACT) return <>the email address shown on the app&apos;s Google Play page</>;
  return <a href={`mailto:${CONTACT}?subject=${encodeURIComponent(subject)}`} style={{ color: t.deep }}>{CONTACT}</a>;
}

function Privacy() {
  return (
    <>
      <h1 style={h1}>Privacy policy</h1>
      <p>
        {APP} runs football and cricket tournaments: teams, fixtures, live scoring, tables and stats. This page says
        what it keeps about you, who can see it, and how to have it removed. It has no ads, sells nothing about you,
        and doesn&apos;t track you across other apps or websites.
      </p>

      <h2 style={h2}>What it keeps</h2>
      <ul>
        <li><strong>Your account:</strong> your name, and the email address and/or mobile number you sign in with. There are no passwords: you sign in with a one-time code.</li>
        <li><strong>Your cricket profile,</strong> if you fill it in (role, batting and bowling style).</li>
        <li><strong>Pictures you add:</strong> your profile photo, and a tournament&apos;s logo and banner if you own it. They&apos;re made smaller on your device before upload, which also removes where the photo was taken.</li>
        <li><strong>What you and others enter in tournaments:</strong> teams, players&apos; names and shirt numbers, fixtures, and every goal, card, ball and result.</li>
        <li><strong>People you add.</strong> When you add an owner, scorer or player by email or number, it&apos;s kept so they can be linked to their place, or sent an invite if they have no account yet.</li>
        <li><strong>Sign-in records:</strong> which devices are signed in (a random device id and the app&apos;s version), so you can sign out of all of them.</li>
        <li><strong>Request logs:</strong> each request to the server, with its network address, for 48 hours, to find faults and stop abuse. Sign-in codes are stored only in scrambled form, never as typed.</li>
      </ul>

      <h2 style={h2}>Who can see it</h2>
      <ul>
        <li>Everyone in a tournament sees its teams, players&apos; names, matches and stats.</li>
        <li>Only a tournament&apos;s owners see the emails and numbers used to add people to it.</li>
        <li>Your profile photo is seen by people in your tournaments, beside your name and on your profile. It is never on public pages; a tournament&apos;s logo and banner are.</li>
        <li>Every tournament is <strong>public</strong>: anyone with its link can watch its scores, tables and stats and see the names of its teams and players, without an account. Once its schedule is set, anyone signed in can also find it by name and follow it. Emails, numbers, accounts and profile photos are never shown on public pages. If a tournament, or your name in one, should not be public, write to us (below) and we can hide it.</li>
        <li>A <strong>lasting team</strong>&apos;s page (a team kept between tournaments) can be seen by anyone signed in, and by anyone with its link: the team&apos;s name, place and logo, who runs it, its tournaments and results, and its players&apos; names and roles. Emails, numbers and photos are never shown there.</li>
        <li>Once you play in a tournament, anyone signed in can open your player profile: your name and career stats. Your email and number are only ever on your own.</li>
      </ul>

      <h2 style={h2}>Messages it sends</h2>
      <p>
        Sign-in codes and invites go to the email or number they&apos;re for. Updates about your tournaments go to your
        inbox in the app, and some also by email. Nothing is sent for marketing.
      </p>

      <h2 style={h2}>Services it relies on</h2>
      <ul>
        <li><strong>Microsoft Azure</strong> hosts the server and database, in India.</li>
        <li><strong>Google (Gmail)</strong> delivers its emails.</li>
        <li><strong>Meta (WhatsApp)</strong> delivers sign-in codes and invites sent to mobile numbers.</li>
      </ul>
      <p>Each receives only what it needs to do that job.</p>

      <h2 style={h2}>How long it keeps things</h2>
      <ul>
        <li>Your account: until you delete it.</li>
        <li>Inbox notifications: 90 days. Unanswered invites: 30 days. Request logs: 48 hours. Sign-in codes: 5 minutes.</li>
        <li>Tournaments: until their owners delete them.</li>
      </ul>

      <h2 style={h2}>Security</h2>
      <p>
        Everything between the app and the server is encrypted twice: by HTTPS, and again inside the app with a key
        only the server holds.
      </p>

      <h2 style={h2}>Children</h2>
      <p>The app is for people aged 13 and over.</p>

      <h2 style={h2}>Deleting your account</h2>
      <p>
        You can delete your account in the app at any time. <a href="/delete-account" style={{ color: t.deep }}>How to delete your account</a> explains how, and what happens to your data.
      </p>

      <h2 style={h2}>Questions</h2>
      <p>
        Write to <Contact subject={`${APP}: privacy`} />. If this policy changes, the date below changes too, and
        anything that affects you is announced in the app.
      </p>
    </>
  );
}

function DeleteAccount() {
  return (
    <>
      <h1 style={h1}>Delete your account</h1>
      <p>You can delete your {APP} account yourself, in the app or on the website. It takes a minute.</p>

      <h2 style={h2}>In the app</h2>
      <ol>
        <li>Sign in, then open your profile (your name on the home screen).</li>
        <li>Choose <strong>Edit account</strong>, then <strong>Delete account</strong>.</li>
        <li>Read what will happen, then enter the code we send to your email or number.</li>
      </ol>

      <h2 style={h2}>What happens</h2>
      <ul>
        <li>Your name, email, mobile number, cricket profile and profile photo are removed, and every device is signed out.</li>
        <li>Tournaments you alone own are deleted, for everyone in them. Ones with other owners pass to one of them.</li>
        <li>You&apos;re taken off every other tournament.</li>
        <li>Your name stays on scorecards of matches you played in, because they belong to the other teams as well. Your account is no longer linked to them.</li>
        <li>Your email and number are freed. If you sign up again with them, you start with a new, empty account.</li>
      </ul>

      <h2 style={h2}>If you can&apos;t sign in</h2>
      <p>
        Write to <Contact subject={`${APP}: delete my account`} /> from the email address on your account (or say
        which mobile number it uses), with &ldquo;Delete my account&rdquo; as the subject. We&apos;ll confirm it&apos;s you
        and delete it within 30 days.
      </p>
    </>
  );
}
