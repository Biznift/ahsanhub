import { cleanDescription } from "@/lib/sanitize";

/** A small Markdown subset, escaped first so raw HTML cannot get through. */
export function markdownToHtml(source: string) {
  const escaped = source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];
  let list: string[] | null = null;

  const flush = () => {
    if (!list) return;
    html.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
    list = null;
  };

  for (const line of lines) {
    const item = /^(?:-|\*)\s+(.+)$/.exec(line);
    if (item) {
      list ??= [];
      list.push(item[1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      const tag = heading[1].length === 2 ? "h2" : "h3";
      html.push(`<${tag}>${inline(heading[2])}</${tag}>`);
      continue;
    }
    html.push(`<p>${inline(line)}</p>`);
  }
  flush();
  return cleanDescription(html.join(""));
}

function inline(text: string) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}
