import { describe, expect, it } from "vitest";

import { legalPlainText, sanitizeLegalHtml } from "./legal-html";

describe("sanitizeLegalHtml", () => {
  it("keeps document markup and drops pasted styles and unsafe links", () => {
    expect(
      sanitizeLegalHtml(
        '<div class="copy"><span><h2 style="color:red">Aceitação dos termos</h2></span><p><strong>Texto</strong> <font color="blue">legal</font></p><ul><li>Item</li></ul><a href="javascript:alert(1)">Bloqueado</a> <a href="/contato" target="_blank" rel="noopener">Contato</a></div>',
      ),
    ).toBe(
      "<h2>Aceitação dos termos</h2><p><strong>Texto</strong> legal</p><ul><li>Item</li></ul>Bloqueado <a href=\"/contato\" target=\"_blank\" rel=\"noopener\">Contato</a>",
    );
  });

  it("flattens html to a single line of text", () => {
    expect(legalPlainText("<p>Termos <strong>v2</strong></p>")).toBe("Termos v2");
  });
});
