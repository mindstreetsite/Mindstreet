"use client";

import { useState } from "react";
import { OfferingPanel } from "@/components/cms/offering-block";
import { offering } from "@/content/home";

export function Offering() {
  const [openTitle, setOpenTitle] = useState("Rådgivning");

  return (
    <section className="offering" id="erbjudande">
      <div className="section-inner">
        <h2>{offering.title}</h2>
        <div className="offering-list">
          {offering.items.map((item) => {
            const isOpen = openTitle === item.title;
            const panelId = `offering-${item.title.toLowerCase()}`;

            return (
              <article key={item.title} className={isOpen ? "is-open" : undefined}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={item.body ? panelId : undefined}
                    onClick={() => setOpenTitle(isOpen ? "" : item.title)}
                  >
                    <span>{item.title}</span>
                    <span className="plus" aria-hidden="true" />
                  </button>
                </h3>
                {item.body ? (
                  <OfferingPanel open={isOpen} id={panelId}>
                    <p>{item.body}</p>
                    {item.cta ? (
                      <a className="btn offering-link" href={item.cta.href}>
                        {item.cta.label}
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
