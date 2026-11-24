import { api } from "./client";

// Pictures (HLD P-26). Each answers { url }: the picture's new signed link, or null once removed.
// `image` is base64 JPEG from pictures.js's preparePicture.

export const setMyPhoto = (image) => api.call("ACCOUNT_PHOTO_SET", { body: { image } });
export const removeMyPhoto = () => api.call("ACCOUNT_PHOTO_REMOVE");

/** `kind` is "logo" (square) or "banner" (16:9). Owners only. */
export const setTournamentPicture = (tournamentId, kind, image) =>
  api.call("TOURNAMENT_PICTURE_SET", { routeParams: { id: tournamentId, kind }, body: { image } });
export const removeTournamentPicture = (tournamentId, kind) =>
  api.call("TOURNAMENT_PICTURE_REMOVE", { routeParams: { id: tournamentId, kind } });
