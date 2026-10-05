import { api } from "./client";

// Signing in with an emailed code, and the signed-in person's account.

/** Emails a 6-digit code. Answers the same whether or not the email has an account. */
export const sendCode = (email) => api.call("AUTH_OTP_SEND", { body: { email } });

/**
 * Proves the code. { outcome: "SignedIn", sessionToken, sessionId, expiresAt, user } — or, for a
 * new email without a name, { outcome: "NeedsName" }: ask for one and send the same code again.
 */
export const verifyCode = (email, otp, name) => api.call("AUTH_OTP_VERIFY", { body: { email, otp, name: name || null } });

export const signOut = () => api.call("AUTH_LOGOUT");
export const signOutEverywhere = () => api.call("AUTH_LOGOUT_ALL");
export const getAccount = () => api.call("ACCOUNT_GET");
/** `cricket` is optional: left out, the cricket profile stays as it is. */
export const updateAccount = (name, cricket) => api.call("ACCOUNT_UPDATE", { body: cricket === undefined ? { name } : { name, cricket } });

/** What deleting the account would do; also emails the code that confirms it. */
export const previewAccountDeletion = () => api.call("ACCOUNT_DELETE_PREVIEW", { body: {} });

/** Deletes (anonymises) the account. Every session ends, so the next call answers 401. */
export const deleteAccount = (otp) => api.call("ACCOUNT_DELETE", { body: { otp } });
