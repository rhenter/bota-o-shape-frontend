"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { canManageBilling } from "@/lib/permissions";
import { useAppContext } from "./app-context";
import { ErrorState, LoadingState } from "./states";
export { DemoProvider, useDemoContext, useAppContext } from "./app-context";

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: "▦" },
  { href: "/alunos", label: "Alunos", icon: "♙" },
  { href: "/exercicios", label: "Exercícios", icon: "↔" },
  { href: "/equipamentos", label: "Equipamentos", icon: "◫" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const {
    tenant,
    tenants,
    user,
    membership,
    setTenantId,
    mode,
    loading,
    error,
    authenticated,
    logout,
    reload,
  } = useAppContext();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  function closeMenu() {
    setMenuOpen(false);
    menuButton.current?.focus();
  }
  useEffect(() => {
    if (menuOpen)
      sidebar.current?.querySelector<HTMLElement>("button, a")?.focus();
  }, [menuOpen]);
  if (!authenticated)
    return (
      <main className="access-required">
        <h1>Entre para acessar o painel</h1>
        <p>
          A sessão fica somente na memória deste navegador. Ao recarregar, entre
          novamente.
        </p>
        <Link className="button button-primary" href="/entrar">
          Ir para entrar
        </Link>
      </main>
    );
  return (
    <div
      className="app-shell"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) closeMenu();
      }}
    >
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="topbar">
        <button
          ref={menuButton}
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Fechar navegação" : "Abrir navegação"}
          aria-expanded={menuOpen}
          aria-controls="navegacao-principal"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
        <Link
          className="brand"
          href="/dashboard"
          aria-label="Bota o Shape! · início"
        >
          <Image
            src="/brand/logo.png"
            alt="Bota o Shape!"
            width={146}
            height={54}
            priority
          />
        </Link>
        <div className="tenant-switcher">
          <label htmlFor="active-tenant">Academia ativa</label>
          <select
            id="active-tenant"
            value={tenant.id}
            onChange={(event) => {
              setTenantId(event.target.value);
              setMenuOpen(false);
            }}
          >
            {tenants.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="account">
          <span className="avatar" aria-hidden="true">
            {user.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>
              {membership?.roles.includes("admin")
                ? "Administração"
                : "Profissional"}
              {mode === "demo" && " · demo"}
            </small>
          </div>
          <Link
            href="/entrar"
            className="sign-out"
            onClick={() => {
              void logout().catch(() => {});
            }}
          >
            Sair
          </Link>
        </div>
      </header>
      <aside
        ref={sidebar}
        id="navegacao-principal"
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        role={menuOpen ? "dialog" : undefined}
        aria-modal={menuOpen || undefined}
        aria-label={menuOpen ? "Menu principal" : undefined}
        onKeyDown={(event) => {
          if (!menuOpen || event.key !== "Tab") return;
          const controls =
            sidebar.current?.querySelectorAll<HTMLElement>("button, a[href]");
          if (!controls?.length) return;
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <button type="button" className="menu-close" onClick={closeMenu}>
          Fechar menu ✕
        </button>
        <p className="sidebar-eyebrow">PAINEL PROFISSIONAL</p>
        <nav aria-label="Navegação principal">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "page"
                  : undefined
              }
              onClick={() => setMenuOpen(false)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-upcoming">
          <span>Em próximas etapas</span>
          <p>Treinos · Avaliações · Nutrição</p>
          {membership?.roles.includes("admin") && <p>Equipe e configurações</p>}
          {canManageBilling(user, membership, tenant.id) && (
            <p>Cobrança da academia</p>
          )}
        </div>
        <div className="sidebar-footer">
          <strong>{tenant.name}</strong>
          <small>{tenant.cnpj}</small>
          <small>Gestão com cuidado, todos os dias.</small>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="nav-backdrop"
          aria-label="Fechar menu"
          onClick={closeMenu}
          tabIndex={-1}
        />
      )}
      <main id="conteudo" className="main-content" tabIndex={-1}>
        {mode === "demo" ? (
          <div className="demo-banner">
            <span className="demo-dot" aria-hidden="true" />
            <strong>Ambiente de demonstração</strong>
            <span>
              Dados fictícios · alterações temporárias, sem envio ou
              persistência.
            </span>
          </div>
        ) : (
          <div className="api-banner">Conectado à API · {tenant.name}</div>
        )}
        <p className="breadcrumb">
          Painel <span aria-hidden="true">/</span>{" "}
          {navigation.find((item) => pathname.startsWith(item.href))?.label ??
            "Visão geral"}
        </p>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            description={error}
            onRetry={() => {
              void reload();
            }}
          />
        ) : (
          children
        )}
      </main>
    </div>
  );
}
