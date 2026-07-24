// Login and signup. Both render outside the app shell, on the landing page's lighter scale, so
// arriving from a landing CTA doesn't jump between two visual languages.

import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useActingUser } from "../context/ActingUser";

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
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-landing-line">
        <div className="mx-auto flex h-[70px] w-full max-w-[1180px] items-center px-8">
          <Link to="/" className="flex flex-none items-center gap-[11px] no-underline">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-brand text-[17px] font-extrabold text-white">
              K
            </div>
            <div className="text-xl font-extrabold tracking-[-0.02em] text-ink">Kickoff</div>
          </Link>
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
        className="w-full rounded-cta border border-landing-line-strong bg-white px-3.5 py-3 text-[15px] text-ink outline-none focus:border-brand"
      />
      {hint && <div className="mt-1.5 text-[12px] text-faint">{hint}</div>}
    </label>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-5 rounded-cta border border-[#d97066] bg-[#fdf3f2] px-3.5 py-3 text-[13px] text-[#9b3229]"
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

/** API errors are shown verbatim: the backend already words them for humans. */
function messageFor(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Something went wrong. Please try again.";
}

export function LoginPage() {
  const { login } = useActingUser();
  const navigate = useNavigate();
  const target = useRedirectTarget();

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
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to find your next match."
      footer={
        <>
          New to Kickoff?{" "}
          <Link to="/signup" className="font-semibold">
            Create an account
          </Link>
        </>
      }
    >
      {error && <ErrorNote message={error} />}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const { signup } = useActingUser();
  const navigate = useNavigate();
  const target = useRedirectTarget();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup({ name, email, phone, password });
      navigate(target, { replace: true });
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to join. Get matched to a game this week."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold">
            Sign in
          </Link>
        </>
      }
    >
      {error && <ErrorNote message={error} />}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="Name"
          required
          autoFocus
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Phone"
          type="tel"
          autoComplete="tel"
          required
          placeholder="+15555550100"
          hint="Required and unique — teams use it to reach you."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
