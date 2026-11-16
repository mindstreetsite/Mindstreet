"use client";

import { useLayoutEffect, useRef } from "react";

type RevealRule = {
  selector: string;
  variant: "up" | "fade" | "scale";
  stagger?: number;
};

/**
 * Elements that fade/slide in when scrolled into view. `stagger` delays each
 * matching sibling a bit more than the previous one. Anything inside an element
 * that already reveals is skipped so it doesn't animate twice.
 */
const REVEAL_RULES: RevealRule[] = [
  {
    selector:
      ".intro > *, .cms-divider-inner, .cms-text-column-section, .cms-contact-cards-intro, .cms-article-intro, .cms-statement-inner, .cms-module-copy",
    variant: "up",
    stagger: 120,
  },
  {
    selector:
      ".offering > h2, .news .section-inner > h2, .cms-expertise .section-inner > h2, .offering-list > article, .news-grid > article, .cms-expertise-grid > article, .cms-contact-card-grid > article",
    variant: "up",
    stagger: 90,
  },
  {
    selector: ".cms-media-photo, .cms-pair-photos > *, .cms-article-copy > *",
    variant: "up",
    stagger: 140,
  },
  { selector: ".cms-media-shape, .cms-contact-us-shape", variant: "fade" },
  {
    selector: ".seminar, .cms-image > *, .cms-contact-form-photo, .cms-contact-form .section-inner > form",
    variant: "scale",
  },
  {
    selector: ".site-footer > img:not(.footer-shape), .site-footer > address, .site-footer > .footer-links",
    variant: "up",
    stagger: 120,
  },
  { selector: ".footer-shape", variant: "fade" },
];

/** First block under the header bar; it gets a CSS load intro instead (page-blocks.css). */
const INTRO_BLOCK =
  ".site-motion > :is(.site-header, .site-header-slot) + :not(footer), .site-motion > .cms-contact-us:first-child";

const MAX_STAGGER_STEPS = 6;
const ATTRS = ["data-reveal", "data-reveal-state"];

function siblingIndex(el: Element, selector: string) {
  let index = 0;
  let prev = el.previousElementSibling;
  while (prev) {
    if (prev.matches(selector)) index += 1;
    prev = prev.previousElementSibling;
  }
  return Math.min(index, MAX_STAGGER_STEPS);
}

function clearReveal(el: HTMLElement) {
  ATTRS.forEach((attr) => el.removeAttribute(attr));
  el.style.removeProperty("--reveal-delay");
}

export function ScrollReveal() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = markerRef.current?.parentElement;
    if (!root || typeof IntersectionObserver === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const tracked: HTMLElement[] = [];
    const listeners = new Map<HTMLElement, (event: TransitionEvent) => void>();

    const reveal = (el: HTMLElement) => {
      el.setAttribute("data-reveal-state", "shown");
      // Drop the reveal styles afterwards so the element's own hover transitions work again.
      const onEnd = (event: TransitionEvent) => {
        if (event.target !== el || event.propertyName !== "opacity") return;
        el.removeEventListener("transitionend", onEnd);
        listeners.delete(el);
        clearReveal(el);
      };
      listeners.set(el, onEnd);
      el.addEventListener("transitionend", onEnd);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          reveal(entry.target as HTMLElement);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );

    const viewportHeight = window.innerHeight;

    REVEAL_RULES.forEach(({ selector, variant, stagger = 0 }) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (el.hasAttribute("data-reveal") || el.closest(".hero") || el.closest(INTRO_BLOCK)) return;
        if (el.parentElement?.closest("[data-reveal]")) return;
        // Content already on screen at load stays put instead of flashing out and back in.
        const rect = el.getBoundingClientRect();
        if (rect.top < viewportHeight && rect.bottom > 0) return;

        el.setAttribute("data-reveal", variant);
        if (stagger) {
          el.style.setProperty("--reveal-delay", `${siblingIndex(el, selector) * stagger}ms`);
        }
        tracked.push(el);
        observer.observe(el);
      });
    });

    return () => {
      observer.disconnect();
      listeners.forEach((onEnd, el) => el.removeEventListener("transitionend", onEnd));
      tracked.forEach(clearReveal);
    };
  }, []);

  return <span ref={markerRef} hidden />;
}
