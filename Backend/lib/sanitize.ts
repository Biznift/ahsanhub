import sanitizeHtml from "sanitize-html";

export function cleanDescription(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["h2", "h3", "h4", "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote", "a", "code", "pre", "hr"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      // The product name is the page's only h1, so a pasted h1 becomes h2.
      h1: "h2",
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "nofollow noopener noreferrer" }),
    },
  }).trim();
}

export function plainText(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}
