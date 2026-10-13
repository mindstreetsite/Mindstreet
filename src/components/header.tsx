"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openedRef = useRef(false);
  const openFrameRef = useRef(0);
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

  function openMenu() {
    setRendered(true);
    cancelAnimationFrame(openFrameRef.current);
    openFrameRef.current = requestAnimationFrame(() => {
      openFrameRef.current = requestAnimationFrame(() => setOpen(true));
    });
  }

  function closeMenu() {
    cancelAnimationFrame(openFrameRef.current);
    setOpen(false);
    setOpenIndex(null);
    menuButtonRef.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (open) openedRef.current = true;
  }, [open]);

  useEffect(() => {
    if (open || !rendered || !openedRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => {
      openedRef.current = false;
      setRendered(false);
    }, reduce ? 0 : 520);
    return () => window.clearTimeout(timeout);
  }, [open, rendered]);

  useLayoutEffect(() => {
    if (!rendered) return;

    const gap = window.innerWidth - document.documentElement.clientWidth;
    const scrollY = window.scrollY;
    const previousPadding = document.body.style.paddingRight;
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    document.body.style.overflow = "hidden";
    if (window.scrollY !== scrollY) {
      window.scrollTo({ top: scrollY, left: window.scrollX, behavior: "instant" });
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = previousPadding;
    };
  }, [rendered]);

  useEffect(() => {
    if (!rendered) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rendered]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus({ preventScroll: true });
  }, [open]);

  const hero = !bar && rendered ? headerRef.current?.closest(".hero") : null;
  const menuLayer = rendered ? (
    <div className={open ? "menu-layer is-open" : "menu-layer"}>
      <button type="button" className="menu-backdrop" aria-label="Stäng meny" onClick={closeMenu} />
      <nav className="menu-panel" aria-label="Huvudmeny" aria-hidden={!open} inert={!open}>
        <button
          ref={closeButtonRef}
          type="button"
          className="menu-close"
          aria-label="Stäng meny"
          onClick={closeMenu}
        >
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
          ref={menuButtonRef}
          className="menu-button"
          aria-label="Öppna meny"
          aria-expanded={open}
          onClick={openMenu}
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
