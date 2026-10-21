```dataviewjs
const terms = ["mingling", "man", "God"]; // Add as many as desired
const folder = ""; // Leave blank for the entire vault

const pages = folder ? dv.pages(`"${folder}"`) : dv.pages();
const results = [];

function countTerm(content, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "giu"
  );

  return (content.match(pattern) || []).length;
}

for (const page of pages) {
  if (!page.file.path.endsWith(".md")) continue;

  const content = await dv.io.load(page.file.path);
  const counts = terms.map(term => countTerm(content, term));
  const total = counts.reduce((sum, count) => sum + count, 0);

  if (total > 0) {
    results.push({
      note: page.file.link,
      counts,
      total
    });
  }
}

results.sort((a, b) => b.total - a.total);

dv.table(
  ["Note", ...terms, "Combined Total"],
  results.map(result => [
    result.note,
    ...result.counts,
    result.total
  ])
);
```