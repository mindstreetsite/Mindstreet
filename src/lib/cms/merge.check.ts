import {
  absorbRemote,
  applyChange,
  conflictNotice,
  diffStates,
  hasConflicts,
  isChangeEmpty,
  jsonEqual,
  type CmsChange,
} from "./merge";
import type { CmsState } from "./storage";
import type { CmsPage } from "./types";

function page(slug: string, heading: string, published = true): CmsPage {
  return {
    slug,
    title: heading,
    published,
    links: [],
    blocks: [{ id: `${slug}-block`, type: "text", heading, body: heading }],
  };
}

function state(pages: CmsPage[], menu?: CmsState["menu"]): CmsState {
  return {
    pages,
    archive: [],
    templates: [],
    templateArchive: [],
    menu,
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const contact = page("kontakta-oss", "Kontakta oss");
const home = page("", "Startsida");
const base = state([home, contact]);

const anna = state([home, page("kontakta-oss", "Ny kontakt")]);
const colleague = state([page("", "Ny startsida"), contact]);

const annaChange = diffStates(base, anna);
const colleagueChange = diffStates(base, colleague);

assert(annaChange.pages.length === 1 && annaChange.pages[0].id === "kontakta-oss", "Anna diffs only contact");
assert(colleagueChange.pages.length === 1 && colleagueChange.pages[0].id === "", "Colleague diffs only home");
assert(isChangeEmpty(diffStates(base, base)), "Identical states send nothing");

const afterAnna = applyChange(base, annaChange);
assert(afterAnna.applied && !hasConflicts(afterAnna.conflicts), "Anna applies without conflict");
assert(afterAnna.state.pages.find((item) => item.slug === "kontakta-oss")?.title === "Ny kontakt", "Contact updated");
assert(afterAnna.state.pages.find((item) => item.slug === "")?.title === "Startsida", "Home left alone");

const afterBoth = applyChange(afterAnna.state, colleagueChange);
assert(afterBoth.applied && !hasConflicts(afterBoth.conflicts), "Different pages merge");
assert(afterBoth.state.pages.find((item) => item.slug === "kontakta-oss")?.title === "Ny kontakt", "Anna's contact kept");
assert(afterBoth.state.pages.find((item) => item.slug === "")?.title === "Ny startsida", "Colleague's home applied");

const clash: CmsChange = {
  pages: [
    {
      id: "kontakta-oss",
      base: contact,
      next: page("kontakta-oss", "Kollegans kontakt"),
    },
  ],
  archive: [],
  templates: [],
  templateArchive: [],
};
const conflicted = applyChange(afterAnna.state, clash);
assert(!conflicted.applied && hasConflicts(conflicted.conflicts), "Same page conflicts");
assert(conflicted.conflicts.pages.includes("kontakta-oss"), "Conflict lists contact");
assert(
  conflicted.state.pages.find((item) => item.slug === "kontakta-oss")?.title === "Ny kontakt",
  "Conflicting save is rejected",
);
assert(
  conflictNotice(conflicted.conflicts, conflicted.state.pages).includes("Ny kontakt"),
  "Notice names the page",
);

const already = applyChange(afterAnna.state, annaChange);
assert(!already.applied && !hasConflicts(already.conflicts), "Idempotent retry applies nothing");
assert(jsonEqual(already.state.pages, afterAnna.state.pages), "Idempotent retry keeps state");

const trusted = applyChange(afterAnna.state, clash, true);
assert(trusted.applied && !hasConflicts(trusted.conflicts), "Matching etag applies blindly");
assert(trusted.state.pages.find((item) => item.slug === "kontakta-oss")?.title === "Kollegans kontakt", "Trusted write wins");

const absorbedPages = absorbRemote(anna, base, colleague);
assert(!hasConflicts(absorbedPages.conflicts), "Different pages absorb without conflict");
assert(absorbedPages.advanceEtag, "Different pages advance etag");
assert(absorbedPages.state.pages.find((item) => item.slug === "kontakta-oss")?.title === "Ny kontakt", "Absorb keeps local contact");
assert(absorbedPages.state.pages.find((item) => item.slug === "")?.title === "Ny startsida", "Absorb takes remote home");
assert(absorbedPages.confirmed.pages.find((item) => item.slug === "kontakta-oss")?.title === "Kontakta oss", "Absorb keeps contact as save base");
assert(absorbedPages.confirmed.pages.find((item) => item.slug === "")?.title === "Ny startsida", "Absorb confirms remote home");
const absorbedDiff = diffStates(absorbedPages.confirmed, absorbedPages.state);
assert(absorbedDiff.pages.length === 1 && absorbedDiff.pages[0].id === "kontakta-oss", "Next save only sends the dirty page");

const absorbedDirty = absorbRemote(anna, base, base);
assert(!hasConflicts(absorbedDirty.conflicts) && absorbedDirty.advanceEtag, "Dirty page stays without conflict");
assert(absorbedDirty.state.pages.find((item) => item.slug === "kontakta-oss")?.title === "Ny kontakt", "Dirty contact is kept");
assert(absorbedDirty.confirmed.pages.find((item) => item.slug === "kontakta-oss")?.title === "Kontakta oss", "Dirty contact base stays");

const remoteClash = state([home, page("kontakta-oss", "Kollegans kontakt")]);
const absorbedClash = absorbRemote(anna, base, remoteClash);
assert(hasConflicts(absorbedClash.conflicts), "Same page absorb conflicts");
assert(absorbedClash.conflicts.pages.includes("kontakta-oss"), "Absorb conflict lists contact");
assert(!absorbedClash.advanceEtag, "Same page absorb does not advance etag");
assert(absorbedClash.state.pages.find((item) => item.slug === "kontakta-oss")?.title === "Ny kontakt", "Absorb conflict keeps local draft");
assert(absorbedClash.confirmed.pages.find((item) => item.slug === "kontakta-oss")?.title === "Kontakta oss", "Absorb conflict keeps old base");

console.log("cms merge ok");
