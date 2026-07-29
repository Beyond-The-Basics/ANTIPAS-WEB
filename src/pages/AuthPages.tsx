// Login and signup. Both render outside the app shell, on the landing page's lighter scale, so
// arriving from a landing CTA doesn't jump between two visual languages.

import type { TFunction } from "i18next";
import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";
import { useActingUser } from "../context/ActingUser";
import { translateApiError } from "../lib/errors";

/** Where to land after authenticating: back where you were sent from, else the app home. */
function useRedirectTarget(): string {
  const location = useLocation() as { state?: { from?: string } };
  return location.state?.from ?? "/home";
}

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-landing-line">
        <div className="mx-auto flex h-[70px] w-full max-w-[1180px] items-center px-8">
          <Link to="/" className="flex flex-none items-center gap-[11px] no-underline">
            <img src="/logo-icon.png" alt="" className="h-[34px] w-[34px]" />
            <div className="text-xl font-extrabold tracking-[-0.02em] text-ink">Kickoff</div>
          </Link>
          <div className="ms-auto flex items-center gap-1.5">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <h1 className="m-0 mb-2 text-[32px] font-extrabold leading-tight tracking-[-0.02em]">
            {title}
          </h1>
          <p className="m-0 mb-8 text-[15px] text-landing-body">{subtitle}</p>
          {children}
          <div className="mt-6 text-center text-sm text-landing-body">{footer}</div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[12.5px] font-semibold text-landing-body">{label}</div>
      <input
        {...props}
        className="w-full rounded-cta border border-landing-line-strong bg-surface px-3.5 py-3 text-[15px] text-ink outline-none focus:border-brand"
      />
      {hint && <div className="mt-1.5 text-[12px] text-faint">{hint}</div>}
    </label>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-5 rounded-cta border border-danger-border bg-danger-bg px-3.5 py-3 text-[13px] text-danger-text"
    >
      {message}
    </div>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-6 w-full rounded-cta bg-brand px-6 py-3.5 text-base font-bold text-white shadow-btn-brand-lg transition duration-150 hover:brightness-[1.06] disabled:opacity-60"
    >
      {busy ? "…" : children}
    </button>
  );
}

/** Known backend errors get a translated message; anything else falls back generically. */
function messageFor(err: unknown, t: TFunction): string {
  return translateApiError(err, t);
}

export function LoginPage() {
  const { login } = useActingUser();
  const navigate = useNavigate();
  const target = useRedirectTarget();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(messageFor(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <>
          {t("auth.newToKickoff")}{" "}
          <Link to="/signup" className="font-semibold">
            {t("auth.createAccount")}
          </Link>
        </>
      }
    >
      {error && <ErrorNote message={error} />}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label={t("auth.fieldEmail")}
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={t("auth.fieldPassword")}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <SubmitButton busy={busy}>{t("auth.signIn")}</SubmitButton>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const { signup } = useActingUser();
  const navigate = useNavigate();
  const target = useRedirectTarget();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signup({ name, email, phone, password });
      navigate(target, { replace: true });
    } catch (err) {
      setError(messageFor(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.signupTitle")}
      subtitle={t("auth.signupSubtitle")}
      footer={
        <>
          {t("auth.alreadyHaveAccount")}{" "}
          <Link to="/login" className="font-semibold">
            {t("auth.signIn")}
          </Link>
        </>
      }
    >
      {error && <ErrorNote message={error} />}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label={t("auth.fieldName")}
          required
          autoFocus
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label={t("auth.fieldEmail")}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={t("auth.fieldPhone")}
          type="tel"
          autoComplete="tel"
          required
          placeholder="+15555550100"
          hint={t("auth.phoneHint")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Field
          label={t("auth.fieldPassword")}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint={t("auth.passwordHint")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label={t("auth.fieldConfirmPassword")}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <SubmitButton busy={busy}>{t("auth.createAccountButton")}</SubmitButton>
      </form>
    </AuthShell>
  );
}
