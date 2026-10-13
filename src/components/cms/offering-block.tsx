"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CmsCard } from "@/lib/cms/types";

export function OfferingPanel({
  open,
  id,
  children,
}: {
  open: boolean;
  id: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.style.transition = "none";
      el.style.height = open ? "auto" : "0px";
      return;
    }

    const finish = (event: TransitionEvent) => {
      if (event.target !== el || event.propertyName !== "height" || event.elapsedTime < 0.7) return;
      if (open) el.style.height = "auto";
      el.removeEventListener("transitionend", finish);
    };

    const from = el.offsetHeight;
    if (!open && from === 0) {
      el.style.height = "0px";
      return;
    }

    el.style.transition = "none";
    let to = 0;
    if (open) {
      el.style.height = "auto";
      to = el.offsetHeight;
      el.style.height = `${from}px`;
    } else {
      el.style.height = `${from}px`;
    }
    void el.offsetHeight;
    el.style.transition = "";
    el.style.height = open ? `${to}px` : "0px";

    el.addEventListener("transitionend", finish);
    return () => el.removeEventListener("transitionend", finish);
  }, [open]);

  return (
    <div ref={ref} className="offering-panel" id={id} inert={!open} aria-hidden={!open}>
      <div className="offering-body">{children}</div>
    </div>
  );
}

export function OfferingBlock({ heading, items }: { heading: string; items: CmsCard[] }) {
  const [openId, setOpenId] = useState("");

  return (
    <section className="offering">
      <div className="section-inner">
        {heading ? <h2>{heading}</h2> : null}
        <div className="offering-list">
          {items.map((item) => {
            const isOpen = openId === item.id;
            const panelId = `offering-${item.id}`;
            const href = item.href.trim();
            const buttonLabel = item.buttonLabel?.trim() ?? "";
            const hasPanel = Boolean(item.body?.trim() || buttonLabel || href);
            return (
              <article key={item.id} className={isOpen ? "is-open" : undefined}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={hasPanel ? panelId : undefined}
                    onClick={() => setOpenId(isOpen ? "" : item.id)}
                  >
                    <span>{item.heading}</span>
                    <span className="plus" aria-hidden="true" />
                  </button>
                </h3>
                {hasPanel ? (
                  <OfferingPanel open={isOpen} id={panelId}>
                    {item.body ? <p>{item.body}</p> : null}
                    {buttonLabel || href ? (
                      <a className="btn offering-link" href={href || "#"}>
                        {buttonLabel || "Read more"}
                      </a>
                    ) : null}
                  </OfferingPanel>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
