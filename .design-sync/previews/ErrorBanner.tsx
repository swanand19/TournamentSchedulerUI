// ErrorBanner sits on the dark page, above the action that failed, showing the API's own sentence.
import { ErrorBanner, font, footballTheme } from "tournament-scheduler-ui";

const Page = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: footballTheme.background, padding: 20, fontFamily: font.body, maxWidth: 520 }}>{children}</div>
);

export function RuleFromServer() {
  return (
    <Page>
      <ErrorBanner message="Minutes per half must be at least 1." />
    </Page>
  );
}

export function ScorerLock() {
  return (
    <Page>
      <ErrorBanner message="Priya Nair is scoring this match." />
    </Page>
  );
}

export function ServerUnreachable() {
  return (
    <Page>
      <ErrorBanner message="Failed to fetch" />
    </Page>
  );
}
