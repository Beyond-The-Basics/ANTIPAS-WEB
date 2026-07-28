import type { Locale } from "../api/types";
import { useLanguage } from "../context/Language";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "AR" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div
      className={`flex flex-none items-center gap-0.5 rounded-full border border-line bg-white p-0.5 ${className}`}
    >
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLanguage(l.code)}
          className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${
            language === l.code ? "bg-chip text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
