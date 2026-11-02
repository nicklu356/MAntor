"use client";

// Language picker in the header: "🌐 English ▾" opens a list of languages; the current one is ticked.
import { useLocale } from "@/components/LocaleProvider";
import { useDropdown } from "@/components/useDropdown";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n";

export default function LanguageMenu() {
  const { t, locale, setLocale } = useLocale();
  const { open, setOpen, box, button } = useDropdown();

  return (
    <div className="header-menu" ref={box}>
      <button
        ref={button}
        type="button"
        className="lang-switch"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("Language")}
        title={t("Language")}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">🌐</span>
        <span className="lang-name">{LOCALE_NAMES[locale]}</span>
        <span className={open ? "chevron chevron-up" : "chevron"} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="account-dropdown lang-dropdown" role="menu">
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={code === locale}
              lang={code}
              className={code === locale ? "account-dropdown-item current" : "account-dropdown-item"}
              onClick={() => {
                setOpen(false);
                if (code !== locale) setLocale(code);
              }}
            >
              <span className="tick" aria-hidden="true">
                {code === locale ? "✓" : ""}
              </span>
              {LOCALE_NAMES[code]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
