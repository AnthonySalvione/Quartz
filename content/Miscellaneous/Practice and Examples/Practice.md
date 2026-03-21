[[Matthew-20#v26]]

[[Lamentations-05#v21]] - dad likes this verse



I am able to format my links to notes so that they can appear in any way to be clicked on.
Example: The title of the file I want to access is: 
[[2 Timothy-03#v10]]
But that is too long and confusing, so instead I will format the link to just be 
![[2 Timothy-03#v10|2 Tim. 3:10]]

[[1 John-01|1 John]]

[[1 John-01#v1|1 John]]


![[John-13#v1]]
#


```dataviewjs
const pages = dv.pages('"Bible/Books"')
  .where(p => p.author == "John")
  .sort(p => p.file.name, 'asc');

for (const p of pages) {
  dv.paragraph(dv.sectionLink(p.file.path, "v5", true));
}

```
pasting all files that have the author John, and have a heading called "v5", and list the verses with the files they are contained in.
```dataviewjs
const pages = dv.pages('"Ministry Project/Recovery Version Bible"')
  .where(p => p.author == "John")
  .sort(p => p.file.name, 'asc');

for (const p of pages) {
  const file = dv.app.vault.getAbstractFileByPath(p.file.path);
  const cache = dv.app.metadataCache.getFileCache(file);
  const hasV5 = cache?.headings?.some(h => h.heading === "v5");
  if (!hasV5) continue;

  dv.header(3, dv.fileLink(p.file.path));
  dv.paragraph(dv.sectionLink(p.file.path, "v5", true));
}

```