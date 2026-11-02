"use client";

// Small confirmation messages ("Submission saved") in the corner of the screen.
// Usage: const toast = useToast(); toast("Saved"); toast("Could not save", "error");
import { createContext, useCallback, useContext, useState } from "react";
import { useT } from "@/components/LocaleProvider";

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const t = useT();
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((text, tone = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list, { id, text, tone }]);
    setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast-${item.tone}`}>
            {/* Error messages from lib/db.js arrive in English; t() leaves text it does not know alone. */}
            {t(item.text)}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
