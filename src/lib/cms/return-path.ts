export const LAST_PATH_KEY = "mindstreet:last-public-path";
export const RETURN_PATH_KEY = "mindstreet:return-path";

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function publicHref(pathname: string, search = ""): string | null {
  if (isAdminPath(pathname)) return null;
  const path = pathname || "/";
  const query = !search || search === "?" ? "" : search.startsWith("?") ? search : `?${search}`;
  return `${path}${query}`;
}

export function isSafeAppPath(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/\\")) return false;
  if (href.includes("://")) return false;
  const pathname = href.split("?")[0] ?? href;
  return !isAdminPath(pathname);
}

export function normalizeAppPath(href: string): string {
  const queryIndex = href.indexOf("?");
  const path = queryIndex === -1 ? href : href.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : href.slice(queryIndex);
  const trimmed = path !== "/" ? path.replace(/\/+$/, "") : "/";
  return `${trimmed}${query === "?" ? "" : query}`;
}

export function rememberVisit(
  last: string | null,
  current: string,
): { last: string; returnPath: string | null } {
  return {
    last: current,
    returnPath: last && last !== current ? last : null,
  };
}

export function resolveBackHref(fallback: string, stored: string | null, current: string): string {
  if (!stored) return fallback;
  const target = normalizeAppPath(stored);
  if (!isSafeAppPath(target) || target === normalizeAppPath(current)) return fallback;
  return target;
}

export function readReturnPath(): string | null {
  const stored = readSessionValue(RETURN_PATH_KEY);
  if (!stored || !isSafeAppPath(stored)) return null;
  return normalizeAppPath(stored);
}

export function referrerHref(): string | null {
  const referrer = document.referrer;
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.origin !== window.location.origin) return null;
    return publicHref(url.pathname, url.search);
  } catch {
    return null;
  }
}

export function currentPublicHref(): string {
  return publicHref(window.location.pathname, window.location.search) ?? "/";
}

export function persistPublicVisit(pathname: string, search = ""): void {
  const current = publicHref(pathname, search);
  if (!current) return;
  const visit = rememberVisit(readSessionValue(LAST_PATH_KEY), current);
  if (visit.returnPath) writeSessionValue(RETURN_PATH_KEY, visit.returnPath);
  writeSessionValue(LAST_PATH_KEY, visit.last);
}

function readSessionValue(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    return;
  }
}
