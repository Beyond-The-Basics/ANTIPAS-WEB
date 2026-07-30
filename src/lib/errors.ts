// The backend's error text stays in English on the wire (see ANTIPAS-BACKEND's HTTPException
// messages) — teaching every service function to speak three languages is a separate, much larger
// effort. Instead this maps the handful of errors a user actually runs into often to a translated
// message; anything else falls back to a generic translated message keyed by status code, rather
// than leaking raw English into a French/Arabic UI.

import type { TFunction } from "i18next";

import { ApiError } from "../api/client";

const KNOWN_MESSAGES: Record<string, string> = {
  "Email already registered": "errors.emailTaken",
  "Phone already registered": "errors.phoneTaken",
  "Incorrect email or password": "errors.badCredentials",
  "A pending application already exists": "errors.alreadyApplied",
  "User is already an active member": "errors.alreadyMember",
  "Search is no longer open": "errors.searchClosed",
  "Search is not open": "errors.searchClosed",
  "Cannot respond to your own search": "errors.cannotRespondOwn",
  "You are already the captain": "errors.alreadyCaptain",
  // Email verification. The rate-limit message embeds a live countdown ("Please wait 42s…") so it
  // can't be matched here — 429 is handled by status below instead.
  "Incorrect code": "errors.otpIncorrect",
  "That code has expired — request a new one": "errors.otpExpired",
  "Too many incorrect attempts — request a new code": "errors.otpTooManyAttempts",
  "No verification is in progress — request a new code": "errors.otpNoneActive",
  "Could not send the verification email — please try again shortly": "errors.otpSendFailed",
  "This account has no email address to verify": "errors.otpNoEmail",
};

function fallbackKeyForStatus(status: number): string {
  if (status === 401) return "errors.unauthorized";
  if (status === 403) return "errors.forbidden";
  if (status === 404) return "errors.notFound";
  if (status === 409) return "errors.conflict";
  if (status === 422) return "errors.invalid";
  if (status === 429) return "errors.rateLimited";
  if (status >= 500) return "errors.server";
  return "errors.generic";
}

export function translateApiError(err: unknown, t: TFunction): string {
  if (err instanceof ApiError) {
    return t(KNOWN_MESSAGES[err.message] ?? fallbackKeyForStatus(err.status));
  }
  return t("errors.generic");
}
