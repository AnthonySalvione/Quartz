<%*
const selected = tp.file.selection();
if (!selected || !selected.trim()) {
throw new Error("Select your outline first (Ctrl+A for the whole note), then run Format-Outline.");
}
tR += tp.user.format_outline(selected);
-%>