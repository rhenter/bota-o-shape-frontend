import { describe, expect, it } from "vitest";
import { portugueseSocial } from "./social-metadata";

describe("portugueseSocial", () => {
  it("keeps the shared card in Brazilian Portuguese", () => {
    const card = portugueseSocial("home");
    expect(card.openGraph).toMatchObject({
      title: "Bota o Shape! — Gestão completa para academias",
      description: "Treinos, avaliações, nutrição, alunos e equipe em uma plataforma para academias.",
      locale: "pt_BR",
      url: "/",
    });
    expect(card.openGraph).toMatchObject({ images: [{ url: "/opengraph-image", width: 1200, height: 630 }] });
    expect(card.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Bota o Shape! — Gestão completa para academias",
      images: ["/opengraph-image"],
    });
  });
});
