import { useMemo } from "react";
import { publicLeagueSource } from "../api/leaguesApi";
import LeaguePage from "./LeaguePage";

// A league's public page at /leagues/<code>: for anyone with the link, signed in or not. Names and results only — the
// server strips accounts, emails and numbers. Each season links to its own live scores.

export default function PublicLeague({ code }) {
  const source = useMemo(() => publicLeagueSource(code), [code]);
  return <LeaguePage source={source} />;
}
