import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { insertTable, joinRichParts, parseTable, plainText, RichText, splitRichParts, tableColumnWidths } from "./inline";

function render(text: string) {
  return renderToStaticMarkup(createElement(RichText, { text }));
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const milestone = `| År | Händelse |
| --- | --- |
| Juli 2026 | **Deadline** för standarder |
| Juli 2027 | [AMLR](https://example.com) blir tillämplig |`;

const parsed = parseTable(milestone);
if (!parsed) throw new Error("A delimited block is a table");
assert(parsed.headers.length === 2 && parsed.headers[0] === "År" && parsed.headers[1] === "Händelse", "Header cells");
assert(parsed.rows.length === 2, "Two body rows");
assert(parsed.rows[0][0] === "Juli 2026", "First cell");
assert(parsed.rows[0][1].includes("**Deadline**"), "Bold mark stays in the cell");

const html = render(milestone);
assert(html.includes('<table class="cms-table">'), "Renders a table");
assert(html.includes('style="width:30%"') && html.includes('style="width:70%"'), "Two columns use 30/70");
assert(tableColumnWidths(3).join(",") === "20%,50%,30%", "Three columns use 20/50/30");
assert(html.includes("<th") && html.includes("År") && html.includes("Händelse"), "Header row");
assert((html.match(/<td/g) ?? []).length === 4, "Four body cells");
assert(html.includes("<strong>Deadline</strong>"), "Bold renders inside a cell");
assert(html.includes('href="https://example.com"'), "Link renders inside a cell");

const injected = `| År | Händelse |
| --- | --- |
| <script>alert(1)</script> | ok |`;
const safe = render(injected);
assert(!safe.includes("<script>"), "Cell text is not inserted as HTML");
assert(safe.includes("&lt;script&gt;"), "Markup in a cell is escaped");

const prose = "Pris | 100 kr utan avgränsare";
assert(parseTable(prose) === null, "A pipe without a delimiter row is not a table");
const proseHtml = render(prose);
assert(!proseHtml.includes("<table"), "Prose stays prose");
assert(proseHtml.includes("Pris | 100 kr utan avgränsare"), "The pipe stays in the text");

const mixed = `Inledning

${milestone}

Efteråt`;
const mixedHtml = render(mixed);
assert(mixedHtml.includes("<table"), "A blank line keeps the table as its own paragraph");
assert(mixedHtml.includes("Inledning") && mixedHtml.includes("Efteråt"), "Text around the table remains");

assert(plainText(milestone) === "År Händelse Juli 2026 Deadline för standarder Juli 2027 AMLR blir tillämplig", "Plain text drops the grid and the marks");

const shortRule = `| År | Händelse | Status |
| -- | --- |
| Juli 2026 | Deadline | Pågår |`;
const wide = parseTable(shortRule);
if (!wide) throw new Error("A short rule still starts a table");
assert(wide.headers.length === 3 && wide.headers[2] === "Status", "A third column survives a shorter rule");
assert(wide.rows[0][2] === "Pågår", "The third cell is kept");

const plainGrid = parseTable(`| År | Händelse |
| Juli 2026 | Deadline |`);
if (!plainGrid) throw new Error("A table does not need a rule row");
assert(plainGrid.headers[0] === "År" && plainGrid.rows[0][1] === "Deadline", "The second line is a text row");

const inserted = insertTable("Inledning", "Inledning".length, "Inledning".length);
assert(inserted.value.startsWith("Inledning\n\n|"), "A table after text gets a blank line");
const insertedParts = splitRichParts(inserted.value);
assert(insertedParts.length === 2 && insertedParts[1].kind === "table", "Inserted text splits into prose and a table");
if (insertedParts[1].kind === "table") {
  assert(insertedParts[1].table.headers.length === 2 && insertedParts[1].table.rows.length === 1, "A new table is 2 by 2");
}

const alone = insertTable("", 0, 0);
const aloneTable = parseTable(alone.value);
if (!aloneTable) throw new Error("The inserted template is a table");
assert(aloneTable.headers.length === 2 && aloneTable.rows.length === 1, "An empty field gets two columns and two rows");
assert(joinRichParts(splitRichParts(milestone)) === milestone, "A saved table round-trips");

console.log("cms inline tables ok");
