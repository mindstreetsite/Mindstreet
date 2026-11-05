"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { menuItems } from "@/content/home";
import { onDark, surfaceById } from "@/lib/design/palette";
import type { BlockTheme } from "@/lib/cms/types";

export function Header({
  variant = "overlay",
  items,
  theme,
}: {
  variant?: "overlay" | "bar";
  theme?: BlockTheme;
  items?: { label: string; href: string; children?: { label: string; href: string }[] }[];
}) {
  const headerRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [closePos, setClosePos] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const [slotHeight, setSlotHeight] = useState(0);
  const openedRef = useRef(false);
  const openFrameRef = useRef(0);
  const pinnedRef = useRef(false);
  const bar = variant === "bar";
  const surface = theme ? surfaceById(theme) : undefined;
  const lightMarks = surface ? surface.on === onDark : !bar && !pinned;
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

  useLayoutEffect(() => {
    if (!rendered) return;

    const placeClose = () => {
      const button = menuButtonRef.current;
      const panel = panelRef.current;
      const layer = layerRef.current;
      if (!button || !panel || !layer) return;
      const buttonRect = button.getBoundingClientRect();
      const layerRect = layer.getBoundingClientRect();
      setClosePos({
        top: buttonRect.top - layerRect.top - panel.offsetTop,
        left: buttonRect.left - layerRect.left - panel.offsetLeft,
        width: buttonRect.width,
        height: buttonRect.height,
      });
    };

    placeClose();
    window.addEventListener("resize", placeClose);
    return () => window.removeEventListener("resize", placeClose);
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

  useEffect(() => {
    const node = headerRef.current;
    if (!node?.isConnected) return;
    if (node.closest(".admin-miniature-page, .admin-menu-preview")) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const current = headerRef.current;
        const y = window.scrollY;
        const height = current?.offsetHeight ?? 0;
        const revealAfter = Math.max(height + 96, 180);
        const next = pinnedRef.current ? y > 1 : y > revealAfter;
        if (next === pinnedRef.current) return;
        if (next && bar) setSlotHeight(height || 120);
        pinnedRef.current = next;
        setPinned(next);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScroll);
    };
  }, [bar]);

  const hero = !pinned && !bar && rendered ? headerRef.current?.closest(".hero") : null;
  const menuLayer = rendered ? (
    <div ref={layerRef} className={open ? "menu-layer is-open" : "menu-layer"}>
      <button type="button" className="menu-backdrop" aria-label="Stäng meny" onClick={closeMenu} />
      <nav ref={panelRef} className="menu-panel" aria-label="Huvudmeny" aria-hidden={!open} inert={!open}>
        <button
          ref={closeButtonRef}
          type="button"
          className="menu-close"
          aria-label="Stäng meny"
          onClick={closeMenu}
          style={
            closePos
              ? {
                  top: closePos.top,
                  left: closePos.left,
                  width: closePos.width,
                  height: closePos.height,
                  right: "auto",
                }
              : undefined
          }
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

  const header = (
    <>
      <header
        ref={headerRef}
        className={
          bar
            ? `site-header is-bar${surface ? ` cms-theme-${surface.id}` : ""}${lightMarks ? " is-on-dark" : ""}${pinned ? " is-pinned" : ""}`
            : `site-header${pinned ? " is-pinned" : ""}`
        }
        style={
          surface
            ? ({ "--header-surface": surface.color } as CSSProperties)
            : undefined
        }
      >
        <div className="site-header-inner">
          <a href="/" className="logo-link">
            <img
              src={lightMarks ? "/icons/logo.svg" : "/icons/logo-gray.svg"}
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
              src={lightMarks ? "/icons/menu.svg" : "/icons/menu-gray.svg"}
              width={37.41}
              height={32}
              alt=""
            />
          </button>
        </div>
        {hero ? null : menuLayer}
      </header>
      {hero && menuLayer ? createPortal(menuLayer, hero) : null}
    </>
  );

  return (
    <>
      {bar && pinned ? (
        <div className="site-header-slot" style={{ height: slotHeight }} aria-hidden="true" />
      ) : null}
      {pinned ? createPortal(header, document.body) : header}
    </>
  );
}
