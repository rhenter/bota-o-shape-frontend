const allowedTags = new Set(["h2", "h3", "p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"]);
const allowedLinkAttributes = new Set(["href", "target", "rel"]);

function safeHref(value: string) {
  const href = value.trim();
  if (!href) return null;
  try {
    const url = new URL(href, window.location.origin);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) || href.startsWith("#")
      ? href
      : null;
  } catch {
    return href.startsWith("#") ? href : null;
  }
}

function cleanChildren(source: Node, target: Node) {
  source.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(child.textContent || ""));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const element = child as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === "div") {
      const paragraph = document.createElement("p");
      cleanChildren(element, paragraph);
      if (paragraph.querySelector("h2, h3, p, ul, ol")) {
        while (paragraph.firstChild) target.appendChild(paragraph.firstChild);
      } else {
        target.appendChild(paragraph);
      }
      return;
    }
    if (!allowedTags.has(tag)) {
      cleanChildren(element, target);
      return;
    }

    const clean = document.createElement(tag);
    if (tag === "a") {
      const href = safeHref(element.getAttribute("href") || "");
      if (!href) {
        cleanChildren(element, target);
        return;
      }
      clean.setAttribute("href", href);
      for (const attribute of allowedLinkAttributes) {
        if (attribute === "href") continue;
        const value = element.getAttribute(attribute);
        if (value) clean.setAttribute(attribute, value);
      }
    }
    cleanChildren(element, clean);
    target.appendChild(clean);
  });
}

export function sanitizeLegalHtml(value: string) {
  const template = document.createElement("template");
  template.innerHTML = value;
  const clean = document.createDocumentFragment();
  cleanChildren(template.content, clean);
  const container = document.createElement("div");
  container.appendChild(clean);
  return container.innerHTML;
}

export function legalPlainText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
