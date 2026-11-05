"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import {
  currentPublicHref,
  readReturnPath,
  referrerHref,
  resolveBackHref,
} from "@/lib/cms/return-path";

export function ArticleBackLink({ href, children }: { href: string; children: ReactNode }) {
  const [target, setTarget] = useState(href);

  useEffect(() => {
    setTarget(resolveBackHref(href, readReturnPath(), currentPublicHref()));
  }, [href]);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const destination = resolveBackHref(href, readReturnPath(), currentPublicHref());
    if (referrerHref() === destination && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
      return;
    }
    if (destination === href) return;
    event.preventDefault();
    window.location.assign(destination);
  }

  return (
    <a className="cms-article-back" href={target} onClick={onClick}>
      {children}
    </a>
  );
}
