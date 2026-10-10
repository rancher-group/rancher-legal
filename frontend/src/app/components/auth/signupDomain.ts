// Self-service signup is limited to Rancher team members. This check is UX
// only; the backend (SIGNUP_ALLOWED_EMAIL_DOMAINS) and a Supabase auth hook
// enforce it.
export const SIGNUP_EMAIL_DOMAIN = "gorancher.com";

export const signupDomainMessage = `Use your @${SIGNUP_EMAIL_DOMAIN} email address.`;

export function isAllowedSignupEmail(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    const at = normalized.lastIndexOf("@");
    return at > 0 && normalized.slice(at + 1) === SIGNUP_EMAIL_DOMAIN;
}
