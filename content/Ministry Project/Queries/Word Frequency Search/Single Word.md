```dataviewjs
const term = "good"; // Change this word
const folder = "";    // Leave blank for the entire vault

const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(
  `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
  "giu"
);

const pages = folder
  ? dv.pages(`"${folder}"`)
  : dv.pages();

const results = [];

for (const page of pages) {
  if (!page.file.path.endsWith(".md")) continue;

  const content = await dv.io.load(page.file.path);
  const count = (content.match(pattern) || []).length;

  if (count > 0) {
    results.push({
      note: page.file.link,
      count
    });
  }
}

results.sort((a, b) => b.count - a.count);

dv.table(
  [`Notes containing “${term}”`, "Occurrences"],
  results.map(result => [result.note, result.count])
);
```
