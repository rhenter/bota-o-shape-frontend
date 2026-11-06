"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { hasCapability } from "./capability-guard";
import { useAuth } from "./auth-context";
import type { PlatformCapability } from "@/lib/platform-api";

const navigation: Array<{
  href: string;
  label: string;
  capability?: PlatformCapability;
}> = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/contas", label: "Contas", capability: "accounts.read" },
  { href: "/cobranca", label: "Cobrança", capability: "billing.manage" },
  { href: "/suporte", label: "Suporte", capability: "support.manage" },
  { href: "/configuracoes", label: "Configurações", capability: "settings.manage" },
  { href: "/seguranca", label: "Segurança" },
];

export function PlatformShell({ children }: { children: ReactNode }) {
  const { ready, membership, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLElement>(null);

  useEffect(() => {
    if (menuOpen) menu.current?.querySelector<HTMLElement>("a, button")?.focus();
  }, [menuOpen]);

  if (!ready) {
    return <main className="centered-state">Validando sessão segura…</main>;
  }
  if (!membership) {
    return (
      <main className="centered-state">
        <p className="eyebrow">SaaS Admin</p>
        <h1>Entre para operar a plataforma</h1>
        <p>Sua sessão não é compartilhada com o painel das academias.</p>
        <Link className="button button-primary" href="/entrar">
          Ir para o login
        </Link>
      </main>
    );
  }

  const visibleNavigation = navigation.filter(
    (item) => !item.capability || hasCapability(membership, item.capability),
  );

  return (
    <div className="shell" onKeyDown={(event) => event.key === "Escape" && setMenuOpen(false)}>
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
      <header className="topbar">
        <button
          className="menu-button"
          type="button"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="platform-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          ☰
        </button>
        <Link className="brand" href="/dashboard">Bota o Shape <strong>SaaS</strong></Link>
        <div className="operator">
          <span><strong>{membership.name || membership.email}</strong><small>{membership.email}</small></span>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              void logout().finally(() => router.replace("/entrar"));
            }}
          >
            Sair
          </button>
        </div>
      </header>
      <aside
        ref={menu}
        id="platform-navigation"
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Navegação da plataforma"
      >
        <p className="eyebrow">OPERAÇÃO GLOBAL</p>
        <nav>
          {visibleNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="sidebar-note">Ações são autorizadas novamente pela API.</p>
      </aside>
      {menuOpen && <button className="backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
      <main id="conteudo" className="content" tabIndex={-1}>{children}</main>
    </div>
  );
}
