"use client";

// Home banner: the MAntor wordmark with its four orange rays, then the tagline on navy.
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { useT } from "./LocaleProvider";

// A four-point spark. Each ray is the same shape, sized and placed by CSS (.ray-*).
function Ray({ className }) {
  return (
    <svg className={`ray ${className}`} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 0 C55 35 65 45 100 50 C65 55 55 65 50 100 C45 65 35 55 0 50 C35 45 45 35 50 0 Z" />
    </svg>
  );
}

export default function Hero() {
  const t = useT();
  return (
    <section className="hero-banner bleed">
      <div className="hero-top">
        <h1 className="wordmark">
          <Ray className="ray-tl" />
          <Ray className="ray-tr" />
          <span className="wordmark-text">{APP_NAME}</span>
          <Ray className="ray-bl" />
          <Ray className="ray-br" />
        </h1>
      </div>
      <div className="hero-band">
        <p>{t(APP_TAGLINE)}</p>
      </div>
    </section>
  );
}
