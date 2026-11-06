"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Profile = "gestor" | "professor" | "nutricionista" | "aluno";
type Screen = { src: string; alt: string };

const profiles: Array<{ id: Profile; title: string; subtitle: string; screens: Screen[] }> = [
  {
    id: "gestor",
    title: "Gestão da academia",
    subtitle: "Visão da operação, alunos, avaliações, equipe e assinatura.",
    screens: [
      { src: "/screens/admin/01-login-dashboard-alunos-exercicios.png", alt: "Dashboard, alunos e exercícios do painel" },
      { src: "/screens/admin/02-equipamentos-treinos-avaliacoes-agenda.png", alt: "Equipamentos, treinos, avaliações e agenda" },
      { src: "/screens/admin/07-assinatura-da-academia.png", alt: "Assinatura e uso da academia" },
      { src: "/screens/admin/08-equipe-perfis-e-acesso-mobile.png", alt: "Equipe, perfis e acesso mobile" },
    ],
  },
  {
    id: "professor",
    title: "Professor",
    subtitle: "Criação, atribuição e acompanhamento de treinos e avaliações.",
    screens: [
      { src: "/screens/admin/02-equipamentos-treinos-avaliacoes-agenda.png", alt: "Construtor, atribuição e avaliações" },
      { src: "/screens/admin/06-montador-com-observacao.png", alt: "Montador de treino com orientação ao aluno" },
      { src: "/screens/admin/08-equipe-perfis-e-acesso-mobile.png", alt: "Painel responsivo do professor" },
    ],
  },
  {
    id: "nutricionista",
    title: "Nutricionista",
    subtitle: "Carteira de alunos, planos alimentares, acompanhamento e catálogo.",
    screens: [
      { src: "/screens/admin/03-nutricao-equipe-configuracoes-auditoria.png", alt: "Área da nutrição e configurações" },
      { src: "/screens/admin/04-fluxo-nutricionista-plano-alimentar.png", alt: "Fluxo de criação e publicação de plano alimentar" },
      { src: "/screens/admin/05-catalogo-e-editor-nutricional.png", alt: "Catálogo e editor nutricional" },
    ],
  },
  {
    id: "aluno",
    title: "Aluno (App)",
    subtitle: "Treino, progresso, avaliações e nutrição no celular.",
    screens: [
      { src: "/screens/app/01-app-fluxo-principal.png", alt: "Fluxo principal do aplicativo do aluno" },
      { src: "/screens/app/03-progresso-avaliacao-nutricao-perfil.png", alt: "Progresso, avaliação, nutrição e perfil" },
      { src: "/screens/app/05-plano-alimentar-aluno.png", alt: "Plano alimentar no aplicativo" },
      { src: "/screens/app/06-busca-e-calculo-alimentar.png", alt: "Busca e cálculo alimentar" },
    ],
  },
];

export function ProductShowcase() {
  const [profileId, setProfileId] = useState<Profile>("gestor");
  const [screenIndex, setScreenIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
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
      <div className="profile-tabs" aria-label="Escolha um perfil">
        {profiles.map((item) => (
          <button key={item.id} type="button" aria-pressed={profileId === item.id} onClick={() => chooseProfile(item.id)}>
            <strong>{item.title}</strong>
            <span>{item.subtitle}</span>
          </button>
        ))}
      </div>
      <div className="screen-gallery">
        <div className="screen-heading">
          <div><span>Funcionalidades</span><h2 id="showcase-title">{profile.title}</h2><p>{profile.subtitle}</p></div>
          <span className="zoom-hint">Clique na tela para ampliar</span>
        </div>
        <button type="button" className="screen-main" onClick={() => setZoomed(true)} aria-label={`Ampliar: ${screen.alt}`}>
          <Image src={screen.src} alt={screen.alt} width={1774} height={1024} sizes="(max-width: 760px) 100vw, 68vw" />
        </button>
        <div className="screen-thumbnails" aria-label="Outras telas">
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
          <button type="button" className="lightbox-close" onClick={() => setZoomed(false)} aria-label="Fechar imagem ampliada">×</button>
          <Image src={screen.src} alt={screen.alt} width={2172} height={1536} sizes="96vw" />
        </div>
      )}
    </section>
  );
}
