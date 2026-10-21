import { useContext } from "react";
import { OpenPlayerContext } from "./playerContext";

// A player's name that opens their profile. Leaderboards and team lists nest boards inside
// boards, so the "open a profile" handler travels by context: the page provides it once, every
// name below picks it up. Without a provider (or an id), the name is plain text.

const link = {
  background: "none",
  border: "none",
  padding: 0,
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
  textAlign: "left",
  textDecoration: "underline",
  textDecorationThickness: 1,
  textUnderlineOffset: 3,
};

export default function PlayerName({ playerId, children }) {
  const open = useContext(OpenPlayerContext);
  if (!open || playerId == null) return children;
  return (
    <button type="button" onClick={() => open(playerId)} style={link} title="Open their profile">
      {children}
    </button>
  );
}
