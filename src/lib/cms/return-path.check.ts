import {
  isAdminPath,
  isSafeAppPath,
  normalizeAppPath,
  publicHref,
  rememberVisit,
  resolveBackHref,
} from "./return-path";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(isAdminPath("/admin"), "Admin root is admin");
assert(isAdminPath("/admin/pages"), "Admin child is admin");
assert(!isAdminPath("/"), "Home is public");
assert(!isAdminPath("/nyheter"), "News is public");
assert(!isAdminPath("/administration"), "Nearby slug is public");

assert(publicHref("/admin") === null, "Admin href is skipped");
assert(publicHref("/nyheter") === "/nyheter", "News href is kept");
assert(publicHref("/", "?page=2") === "/?page=2", "Search is kept");
assert(publicHref("/nyheter", "?") === "/nyheter", "Empty search is dropped");

assert(isSafeAppPath("/nyheter"), "App path is safe");
assert(!isSafeAppPath("//evil.example"), "Protocol-relative is unsafe");
assert(!isSafeAppPath("/admin"), "Admin is unsafe as return");
assert(!isSafeAppPath("https://example.com/"), "Absolute url is unsafe");

assert(normalizeAppPath("/nyheter/") === "/nyheter", "Trailing slash is stripped");
assert(normalizeAppPath("/") === "/", "Root stays");
assert(normalizeAppPath("/nyheter?") === "/nyheter", "Empty query is dropped");

const first = rememberVisit(null, "/");
assert(first.last === "/" && first.returnPath === null, "First visit has no return");

const next = rememberVisit("/", "/aml-paketet");
assert(next.returnPath === "/", "Next page remembers home");

const refresh = rememberVisit("/aml-paketet", "/aml-paketet");
assert(refresh.returnPath === null, "Refresh keeps previous return");

assert(resolveBackHref("/", "/nyheter", "/aml-paketet") === "/nyheter", "Stored path wins");
assert(resolveBackHref("/", null, "/aml-paketet") === "/", "Missing store uses fallback");
assert(resolveBackHref("/", "/aml-paketet", "/aml-paketet") === "/", "Current path is ignored");
assert(resolveBackHref("/", "/admin", "/aml-paketet") === "/", "Admin store is ignored");

console.log("cms return-path ok");
