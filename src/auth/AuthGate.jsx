import SignIn from "./SignIn";
import { useSession } from "./useSession";

/**
 * Nothing but the sign-in screen until there is a session. When the server ends one (signed out
 * elsewhere, expired, blocked), client.js clears it and this drops back to sign-in by itself.
 */
export default function AuthGate({ children }) {
  const session = useSession();
  return session ? children : <SignIn />;
}
