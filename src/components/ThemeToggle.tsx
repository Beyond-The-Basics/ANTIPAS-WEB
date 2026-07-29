import { useTranslation } from "react-i18next";

import type { Theme } from "../api/types";
import { useTheme } from "../context/Theme";

const OPTIONS: { value: Theme; icon: string }[] = [
  { value: "light", icon: "☀️" },
  { value: "dark", icon: "🌙" },
  { value: "system", icon: "🖥️" },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div
      className={`flex flex-none items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 ${className}`}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          title={t(`theme.${o.value}`)}
          aria-label={t(`theme.${o.value}`)}
          aria-pressed={theme === o.value}
          onClick={() => setTheme(o.value)}
          className={`rounded-full px-2.5 py-1 text-[13px] ${
            theme === o.value ? "bg-chip" : "opacity-60 hover:opacity-100"
          }`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
