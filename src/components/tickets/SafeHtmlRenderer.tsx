import DOMPurify from "dompurify";

interface SafeHtmlRendererProps {
  html: string;
  className?: string;
}

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "a", "b", "i", "u", "em", "strong", "p", "br", "div", "span",
    "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "pre", "code", "hr", "table", "thead", "tbody",
    "tr", "th", "td", "img", "iframe", "figure", "figcaption",
    "sub", "sup", "small", "s", "del", "ins", "mark",
  ],
  ALLOWED_ATTR: [
    "href", "target", "rel", "src", "alt", "width", "height",
    "style", "class", "title", "frameborder", "allowfullscreen",
    "allow", "loading",
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ["target"],
};

export default function SafeHtmlRenderer({ html, className }: SafeHtmlRendererProps) {
  const clean = DOMPurify.sanitize(html, PURIFY_CONFIG);

  return (
    <div
      className={className ?? "prose prose-sm dark:prose-invert max-w-none break-words"}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
