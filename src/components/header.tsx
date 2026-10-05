"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { menuItems } from "@/content/home";

export function Header({
  variant = "overlay",
  items,
}: {
  variant?: "overlay" | "bar";
  items?: { label: string; href: string; children?: { label: string; href: string }[] }[];
}) {
  const headerRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const bar = variant === "bar";
  const configured = (items ?? [])
    .map((item) => ({
      label: item.label.trim(),
      href: item.href.trim() || "#",
      children: (item.children ?? [])
        .map((child) => ({ label: child.label.trim(), href: child.href.trim() || "#" }))
        .filter((child) => child.label),
    }))
    .filter((item) => item.label);
  const links =
    configured.length > 0
      ? configured
      : menuItems.map((item) => ({ label: item.label, href: item.href, children: [] }));

  function closeMenu() {
    setOpen(false);
    setOpenIndex(null);
  }

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const hero = !bar && open ? headerRef.current?.closest(".hero") : null;
  const menuLayer = open ? (
    <div className="menu-layer">
      <button type="button" className="menu-backdrop" aria-label="Stäng meny" onClick={closeMenu} />
      <nav className="menu-panel" aria-label="Huvudmeny">
        <button type="button" className="menu-close" aria-label="Stäng meny" onClick={closeMenu}>
          <span />
          <span />
        </button>
        <ul>
          {links.map((item, index) => {
            const expanded = openIndex === index;
            return (
              <li key={`${item.label}-${index}`}>
                {item.children.length > 0 ? (
                  <button
                    type="button"
                    className="menu-parent"
                    aria-expanded={expanded}
                    onClick={() => setOpenIndex(expanded ? null : index)}
                  >
                    {item.label}
                    <svg className="menu-parent-arrow" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
                      <path
                        d="M3.5 6.5 9 12l5.5-5.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ) : (
                  <a href={item.href} onClick={closeMenu}>
                    {item.label}
                  </a>
                )}
                {expanded ? (
                  <ul>
                    {item.children.map((child, childIndex) => (
                      <li key={`${child.label}-${childIndex}`}>
                        <a href={child.href} onClick={closeMenu}>
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  ) : null;

  return (
    <>
      <header ref={headerRef} className={bar ? "site-header is-bar" : "site-header"}>
        <a href={bar ? "/" : "#top"} className="logo-link">
          <img
            src={bar ? "/icons/logo-gray.svg" : "/icons/logo.svg"}
            width={239}
            height={46}
            alt="Mindstreet"
          />
        </a>
        <button
          type="button"
          className="menu-button"
          aria-label="Öppna meny"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <img
            src={bar ? "/icons/menu-gray.svg" : "/icons/menu.svg"}
            width={37.41}
            height={32}
            alt=""
          />
        </button>
        {hero ? null : menuLayer}
      </header>
      {hero && menuLayer ? createPortal(menuLayer, hero) : null}
    </>
  );
}
