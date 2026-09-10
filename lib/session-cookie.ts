export const SESSION_COOKIE_NAME = "pretriage_backend_token";
export const SESSION_REFRESH_COOKIE_NAME = "pretriage_backend_refresh_token";
export const SESSION_RENEW_AT_COOKIE_NAME = "pretriage_backend_renew_at";

export const SESSION_COOKIE_NAMES = [
  SESSION_COOKIE_NAME,
  SESSION_REFRESH_COOKIE_NAME,
  SESSION_RENEW_AT_COOKIE_NAME,
] as const;
