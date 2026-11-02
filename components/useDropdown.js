"use client";

// Open/close logic shared by the header menus (account, language): closes on a click outside,
// on Escape (focus goes back to the button), and when you go to another page.
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function useDropdown() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const button = useRef(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    const escape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return { open, setOpen, box, button };
}
