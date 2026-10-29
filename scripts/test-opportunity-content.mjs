import assert from "node:assert/strict";

const {
  normalizePlainText,
  normalizePlainTextList,
  sanitizeOpportunityHtml,
} = await import("../lib/opportunity-content.ts");

assert.equal(
  normalizePlainText("U.S. Embassy Praia Ambassador&amp;rsquo;s &amp; Special"),
  "U.S. Embassy Praia Ambassador’s & Special",
);
assert.equal(normalizePlainText("<strong>Clean</strong>&nbsp; title"), "Clean title");
assert.equal(normalizePlainText("Safe<script>alert(1)</script> title"), "Safe title");
assert.deepEqual(normalizePlainTextList(["NGO &amp; charity", "<b>University</b>"]), ["NGO & charity", "University"]);

const plain = sanitizeOpportunityHtml("First line\nSecond line\n\nNext paragraph");
assert.equal(plain, "<p>First line<br />Second line</p><p>Next paragraph</p>");

const hostile = sanitizeOpportunityHtml(`
  <p onclick="evil()">Safe<script>alert(1)</script><img src="x" onerror="evil()"></p>
  <a href="javascript:alert(1)">Unsafe link</a>
`);
assert.ok(hostile?.includes("<p>Safe</p>"));
assert.ok(!hostile?.includes("script"));
assert.ok(!hostile?.includes("onclick"));
assert.ok(!hostile?.includes("onerror"));
assert.ok(!hostile?.includes("javascript:"));
assert.ok(!hostile?.includes("<img"));
assert.ok(!sanitizeOpportunityHtml('<a href="//unsafe.example">Protocol relative</a>')?.includes("href="));
assert.ok(!sanitizeOpportunityHtml('<a href="relative/path">Relative source link</a>')?.includes("href="));

const safeLink = sanitizeOpportunityHtml('<a style="color:red" onclick="evil()" href="https://example.org/path">Good</a>');
assert.ok(safeLink?.includes('href="https://example.org/path"'));
assert.ok(safeLink?.includes('target="_blank"'));
assert.ok(safeLink?.includes('rel="noopener noreferrer"'));
assert.ok(!safeLink?.includes("style="));
assert.ok(!safeLink?.includes("onclick"));

const structure = sanitizeOpportunityHtml("<p><strong>Bold</strong><br><em>Emphasis</em></p><ul><li>One<ul><li>Nested</li></ul></li></ul>");
assert.ok(structure?.includes("<strong>Bold</strong>"));
assert.ok(structure?.includes("<em>Emphasis</em>"));
assert.ok(structure?.includes("<ul><li>One<ul><li>Nested</li></ul></li></ul>"));

const longValue = `https://example.org/${"very-long-segment".repeat(100)}`;
assert.ok(sanitizeOpportunityHtml(longValue)?.includes("very-long-segment"));

console.log("Opportunity content normalization and XSS checks passed.");
