import { api } from "./client";

// Signing in with a one-time code (by email, or text message once the server can send them), and
// the signed-in person's account.

/** Whether mobile numbers are on: { phone, defaultCountryCode }. Works signed out. */
export const getAuthOptions = () => api.call("AUTH_OPTIONS");

/**
 * Sends a 6-digit code to an email or mobile number; the server works out which. Answers
 * { sentTo, channel: "Email" | "Sms", … } — the same whether or not it has an account.
 */
export const sendCode = (contact) => api.call("AUTH_OTP_SEND", { body: { contact } });

/**
 * Proves the code. { outcome: "SignedIn", sessionToken, sessionId, expiresAt, user } — or, for a
 * new email or number without a name, { outcome: "NeedsName" }: ask for one and send the same code again.
 */
export const verifyCode = (contact, otp, name) => api.call("AUTH_OTP_VERIFY", { body: { contact, otp, name: name || null } });

export const signOut = () => api.call("AUTH_LOGOUT");
export const signOutEverywhere = () => api.call("AUTH_LOGOUT_ALL");
export const getAccount = () => api.call("ACCOUNT_GET");
/** `cricket` is optional: left out, the cricket profile stays as it is. */
export const updateAccount = (name, cricket) => api.call("ACCOUNT_UPDATE", { body: cricket === undefined ? { name } : { name, cricket } });

/** A code to an email or number being added to the account (or replacing the one it has). */
export const sendContactCode = (contact) => api.call("ACCOUNT_CONTACT_SEND", { body: { contact } });
/** Proves it and saves it; answers the account. */
export const verifyContact = (contact, otp) => api.call("ACCOUNT_CONTACT_VERIFY", { body: { contact, otp } });
/** `kind`: "Email" | "Phone". The server refuses the last way to sign in. */
export const removeContact = (kind) => api.call("ACCOUNT_CONTACT_REMOVE", { body: { kind } });

/** What deleting the account would do; also sends the code that confirms it. */
export const previewAccountDeletion = () => api.call("ACCOUNT_DELETE_PREVIEW", { body: {} });

/** Deletes (anonymises) the account. Every session ends, so the next call answers 401. */
export const deleteAccount = (otp) => api.call("ACCOUNT_DELETE", { body: { otp } });
