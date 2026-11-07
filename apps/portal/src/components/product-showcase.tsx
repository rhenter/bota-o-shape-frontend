"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { fill } from "@/i18n/locale";
import { useMessages } from "@/i18n/provider";

type Profile = "gestor" | "professor" | "nutricionista" | "aluno";

const screenSrcs: Record<Profile, string[]> = {
  gestor: [
    "/screens/admin/01-login-dashboard-alunos-exercicios.png",
    "/screens/admin/02-equipamentos-treinos-avaliacoes-agenda.png",
    "/screens/admin/07-assinatura-da-academia.png",
    "/screens/admin/08-equipe-perfis-e-acesso-mobile.png",
  ],
  professor: [
    "/screens/admin/02-equipamentos-treinos-avaliacoes-agenda.png",
    "/screens/admin/06-montador-com-observacao.png",
    "/screens/admin/08-equipe-perfis-e-acesso-mobile.png",
  ],
  nutricionista: [
    "/screens/admin/03-nutricao-equipe-configuracoes-auditoria.png",
    "/screens/admin/04-fluxo-nutricionista-plano-alimentar.png",
    "/screens/admin/05-catalogo-e-editor-nutricional.png",
  ],
  aluno: [
    "/screens/app/01-app-fluxo-principal.png",
    "/screens/app/03-progresso-avaliacao-nutricao-perfil.png",
    "/screens/app/05-plano-alimentar-aluno.png",
    "/screens/app/06-busca-e-calculo-alimentar.png",
  ],
};

const profileOrder: Profile[] = ["gestor", "professor", "nutricionista", "aluno"];

export function ProductShowcase() {
  const showcase = useMessages().showcase;
  const [profileId, setProfileId] = useState<Profile>("gestor");
  const [screenIndex, setScreenIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const profiles = profileOrder.map((id) => {
    const copy = showcase.profiles[id];
    return {
      id,
      title: copy.title,
      subtitle: copy.subtitle,
      screens: screenSrcs[id].map((src, index) => ({ src, alt: copy.alts[index] ?? "" })),
    };
  });
  const profile = profiles.find((item) => item.id === profileId) ?? profiles[0];
  const screen = profile.screens[screenIndex] ?? profile.screens[0];

  useEffect(() => {
    if (!zoomed) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setZoomed(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [zoomed]);

  function chooseProfile(id: Profile) {
    setProfileId(id);
    setScreenIndex(0);
  }

  return (
    <section className="product-showcase" aria-labelledby="showcase-title">
      <div className="profile-tabs" aria-label={showcase.tabs}>
        {profiles.map((item) => (
          <button key={item.id} type="button" aria-pressed={profileId === item.id} onClick={() => chooseProfile(item.id)}>
            <strong>{item.title}</strong>
            <span>{item.subtitle}</span>
          </button>
        ))}
      </div>
      <div className="screen-gallery">
        <div className="screen-heading">
          <div><span>{showcase.features}</span><h2 id="showcase-title">{profile.title}</h2><p>{profile.subtitle}</p></div>
          <span className="zoom-hint">{showcase.zoomHint}</span>
        </div>
        <button type="button" className="screen-main" onClick={() => setZoomed(true)} aria-label={fill(showcase.zoom, { alt: screen.alt })}>
          <Image src={screen.src} alt={screen.alt} width={1774} height={1024} sizes="(max-width: 760px) 100vw, 68vw" />
        </button>
        <div className="screen-thumbnails" aria-label={showcase.thumbnails}>
          {profile.screens.map((item, index) => (
            <button key={item.src} type="button" aria-pressed={screenIndex === index} onClick={() => setScreenIndex(index)}>
              <Image src={item.src} alt="" width={190} height={110} />
              <span>{index + 1}</span>
            </button>
          ))}
        </div>
      </div>
      {zoomed && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={screen.alt} onMouseDown={(event) => event.target === event.currentTarget && setZoomed(false)}>
          <button type="button" className="lightbox-close" onClick={() => setZoomed(false)} aria-label={showcase.close}>×</button>
          <Image src={screen.src} alt={screen.alt} width={2172} height={1536} sizes="96vw" />
        </div>
      )}
    </section>
  );
}
