import { api } from "./client";

// The player pool, the team draw and the auction (2026-11-17, docs/player-pool-and-auction-plan.md).
// Every auction call answers with the whole auction as the caller sees it, every draw call with the
// whole draw, every pool call with the whole pool, so screens redraw from the answer.

const at = (id) => ({ routeParams: { id } });
const send = (id, body) => ({ routeParams: { id }, body: body ?? {} });

// --- The pool -------------------------------------------------------------------
export const getPool = (id) => api.call("POOL_GET", at(id));

/** An "@" makes an email, digits a mobile number, anything else a name. */
export const addPoolPlayer = (id, text, tierId) => {
  const value = text.trim();
  const who = value.includes("@") ? { email: value } : /^[+\d][\d\s-]{6,}$/.test(value) ? { phone: value } : { name: value };
  return api.call("POOL_PLAYER_ADD", send(id, { ...who, tierId }));
};
export const setPoolPlayerTier = (id, poolPlayerId, tierId) =>
  api.call("POOL_PLAYER_UPDATE", { routeParams: { id, poolPlayerId }, body: { tierId, setTier: true } });
export const setPoolPlayerWithdrawn = (id, poolPlayerId, withdrawn) =>
  api.call("POOL_PLAYER_UPDATE", { routeParams: { id, poolPlayerId }, body: { withdrawn } });
export const removePoolPlayer = (id, poolPlayerId) => api.call("POOL_PLAYER_REMOVE", { routeParams: { id, poolPlayerId } });
/** `tiers` = the whole set, top first: [{ id?, name, basePrice, maxPerTeam }]. */
export const saveTiers = (id, tiers) => api.call("POOL_TIERS_SAVE", send(id, { tiers }));
export const setRegistration = (id, open) => api.call("POOL_REGISTRATION", send(id, { open }));
export const setPoolMethod = (id, method) => api.call("POOL_METHOD_SET", send(id, { method }));

// --- The auction ----------------------------------------------------------------
export const getAuction = (id) => api.call("AUCTION_GET", at(id));
/** Any of the auction's actions by service id, with its body. */
export const auctionAction = (id, service, body) => api.call(service, send(id, body));
export const getFillPreview = (id) => api.call("AUCTION_FILL_PREVIEW", at(id));

// --- The draw -------------------------------------------------------------------
export const getDraw = (id) => api.call("DRAW_GET", at(id));
export const drawAction = (id, service, body) => api.call(service, send(id, body));

// --- The hall's TV (public, no session) ------------------------------------------
export const getPublicAuction = (code) => api.call("PUBLIC_AUCTION", { routeParams: { code } });
export const getPublicDraw = (code) => api.call("PUBLIC_DRAW", { routeParams: { code } });
