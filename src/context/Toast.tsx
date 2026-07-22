import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { ApiError } from "../api/client";

type ToastKind = "success" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void;
  /** Run an async action, toast the error (returns false) or a success message (returns true). */
  run: (action: () => Promise<unknown>, successMessage?: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue>({
  notify: () => {},
  run: async () => false,
});

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, kind: ToastKind = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const run = useCallback(
    async (action: () => Promise<unknown>, successMessage?: string) => {
      try {
        await action();
        if (successMessage) notify(successMessage, "success");
        return true;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Request failed";
        notify(message, "error");
        return false;
      }
    },
    [notify],
  );

  return (
    <ToastContext.Provider value={{ notify, run }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
