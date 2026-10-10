import { ssoDomainSchema } from "./ssoConfig";

// Self-service signup is closed unless SIGNUP_ALLOWED_EMAIL_DOMAINS lists the
// exact email domains that may register (comma-separated, for example
// `gorancher.com`). Unset, empty or invalid entries allow nobody. Subdomains
// are not implied: `gorancher.com` does not admit `x.gorancher.com`.
export function signupAllowedDomains(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return (env.SIGNUP_ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => ssoDomainSchema.safeParse(domain).success);
}

export function emailDomainAllowed(
  email: string,
  allowedDomains: readonly string[],
): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return false;
  return allowedDomains.includes(normalized.slice(at + 1));
}
