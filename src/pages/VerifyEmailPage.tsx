// Where the 6-digit code from the verification email gets redeemed. Renders outside the app shell
// on the auth pages' lighter scale, like onboarding — it's a short focused task, not a destination.

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { api, ApiError } from "../api/client";
import type { VerificationStatus } from "../api/types";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useActingUser } from "../context/ActingUser";
import { translateApiError } from "../lib/errors";

const OTP_LENGTH = 6;
/** Mirrors the backend's `otp_resend_interval_seconds`; the server is still the authority — a 429
 * carries the real remaining time and overrides this. */
const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailPage() {
  const { user, refresh } = useActingUser();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const { t } = useTranslation();

  // Signup forwards where the user was originally headed. Landing on it hands off to the app
  // shell, which still owns the onboarding gate — so a brand-new account continues into the
  // wizard rather than this page having to know that rule too.
  const target = location.state?.from ?? "/home";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestedRef = useRef(false);

  // Signup and the email-change flow both send a code before landing here, so the floor starts
  // ticking on arrival rather than only after the first manual resend.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const verify = useCallback(
    async (code: string) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await api.post<VerificationStatus>("/verification/email/verify", { otp: code });
        await refresh();
        navigate(target, { replace: true });
      } catch (err) {
        setError(translateApiError(err, t));
        setOtp("");
        inputRef.current?.focus();
      } finally {
        setBusy(false);
      }
    },
    [refresh, navigate, target, t],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (otp.length === OTP_LENGTH) void verify(otp);
  };

  const resend = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post<VerificationStatus>("/verification/email/resend");
      setNotice(t("verifyEmail.codeSent"));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(translateApiError(err, t));
      // A 429 knows exactly how long is left; prefer it over the local guess.
      if (err instanceof ApiError && err.retryAfter) setCooldown(err.retryAfter);
    } finally {
      setBusy(false);
    }
  };

  // Nothing to do here once verified — most likely a stale tab or a back-button return.
  useEffect(() => {
    if (user?.email_verified) navigate(target, { replace: true });
  }, [user?.email_verified, navigate, target]);

  // Make sure a code is actually on its way when this page loads. Signup and the email-change flow
  // already send one, but arriving here from a plain login — an existing, still-unverified account —
  // otherwise leaves the user waiting for a code that was never sent (the signup one has long since
  // expired). Requesting on load covers every entry point; the backend's resend floor collapses the
  // just-signed-up case into a 429 we read as the countdown, so this never sends a second email.
  useEffect(() => {
    if (requestedRef.current || user?.email_verified) return;
    requestedRef.current = true;
    void (async () => {
      try {
        await api.post<VerificationStatus>("/verification/email/request");
        setNotice(t("verifyEmail.codeSent"));
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } catch (err) {
        // A 429 just means a code was already sent moments ago (signup) — adopt its remaining time
        // rather than surfacing it as an error.
        if (err instanceof ApiError && err.status === 429) {
          if (err.retryAfter) setCooldown(err.retryAfter);
        } else {
          setError(translateApiError(err, t));
        }
      }
    })();
  }, [user?.email_verified, t]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-landing-line">
        <div className="mx-auto flex h-[70px] w-full max-w-[1180px] items-center px-8">
          <div className="flex flex-none items-center gap-[11px]">
            <img src="/logo-icon.png" alt="" className="h-[34px] w-[34px]" />
            <div className="text-xl font-extrabold tracking-[-0.02em] text-ink">Kickoff</div>
          </div>
          <div className="ms-auto">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <h1 className="m-0 mb-2 text-[32px] font-extrabold leading-tight tracking-[-0.02em]">
            {t("verifyEmail.title")}
          </h1>
          <p className="m-0 mb-8 text-[15px] text-landing-body">
            {t("verifyEmail.subtitle")} <strong className="text-ink">{user?.email}</strong>
          </p>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-cta border border-[#d97066] bg-[#fdf3f2] px-3.5 py-3 text-[13px] text-[#9b3229]"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="mb-5 rounded-cta border border-brand bg-landing-tint px-3.5 py-3 text-[13px] text-brand-deep"
            >
              {notice}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <label className="block">
              <div className="mb-1.5 text-[12.5px] font-semibold text-landing-body">
                {t("verifyEmail.codeLabel")}
              </div>
              {/* One field rather than six boxes: paste, autofill and screen readers all handle it,
                  and it sidesteps per-box focus juggling that breaks under RTL. `dir="ltr"` keeps
                  the digits in entry order even when the page is Arabic — a code is a number, not
                  prose. */}
              <input
                ref={inputRef}
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern={`\\d{${OTP_LENGTH}}`}
                maxLength={OTP_LENGTH}
                placeholder="000000"
                aria-label={t("verifyEmail.codeLabel")}
                value={otp}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH);
                  setOtp(digits);
                  // Submitting on the sixth digit saves a tap; the button stays for keyboards
                  // and for retrying after an error.
                  if (digits.length === OTP_LENGTH && !busy) void verify(digits);
                }}
                className="w-full rounded-cta border border-landing-line-strong bg-white px-3.5 py-3 text-center font-mono text-[26px] tracking-[0.4em] text-ink outline-none focus:border-brand"
              />
            </label>

            <button
              type="submit"
              disabled={busy || otp.length !== OTP_LENGTH}
              className="mt-6 w-full rounded-cta bg-brand px-6 py-3.5 text-base font-bold text-white shadow-btn-brand-lg transition duration-150 hover:brightness-[1.06] disabled:opacity-60"
            >
              {busy ? "…" : t("verifyEmail.submit")}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-landing-body">
            {t("verifyEmail.noCode")}{" "}
            <button
              type="button"
              onClick={resend}
              disabled={busy || cooldown > 0}
              className="font-semibold text-brand underline-offset-2 hover:underline disabled:text-faint disabled:no-underline"
            >
              {cooldown > 0 ? t("verifyEmail.resendIn", { seconds: cooldown }) : t("verifyEmail.resend")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
