"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { canManageBilling } from "@/lib/permissions";
import { useAppContext } from "./app-context";
import { NotificationBell } from "./notification-bell";
import { ErrorState, LoadingState } from "./states";
export { DemoProvider, useDemoContext, useAppContext } from "./app-context";

const navigation = [
  {
    href: "/dashboard",
    label: "Visão geral",
    icon: "M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-8ZM9.5 20v-5h5v5",
  },
  {
    href: "/alunos",
    label: "Alunos",
    icon: "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6.5 20a5.5 5.5 0 0 1 11 0",
  },
  {
    href: "/exercicios",
    label: "Exercícios",
    icon: "M6 9v6M18 9v6M3 12h3M18 12h3M6 12h12",
  },
  {
    href: "/equipamentos",
    label: "Equipamentos",
    icon: "M5 20V8h14v12M8 8V5h8v3M9 12h6M9 16h6",
  },
  {
    href: "/treinos",
    label: "Treinos",
    icon: "M7 4h10v16H7zM10 8h4M10 12h4M10 16h2",
  },
  {
    href: "/avaliacoes",
    label: "Avaliações",
    icon: "M5 19V9h3v10H5ZM10.5 19V5h3v14h-3ZM16 19v-7h3v7h-3Z",
  },
  {
    href: "/agenda",
    label: "Agenda",
    icon: "M6 5h12v14H6zM6 9h12M9 3v4M15 3v4",
  },
  {
    href: "/nutricao",
    label: "Nutrição",
    icon: "M12 20V10M12 10c2-4 6-5 6-5-1 4-3 6-6 5ZM12 13c-3 1-6 0-7-2 2 0 4 1 7 2Z",
  },
];
const adminNavigation = [
  {
    href: "/equipe",
    label: "Equipe",
    icon: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 20a5.5 5.5 0 0 1 11 0M17 7v5M14.5 9.5h5",
  },
  {
    href: "/auditoria",
    label: "Auditoria",
    icon: "M12 5a7 7 0 1 1-6.2 3.8M5 5v4h4M12 8v4l2.5 1.5",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4",
  },
  {
    href: "/configuracoes/plano",
    label: "Plano e consumo",
    icon: "M5 19V9h3v10H5ZM10.5 19V5h3v14h-3ZM16 19v-7h3v7h-3Z",
  },
  {
    href: "/configuracoes/cobrancas",
    label: "Cobranças",
    icon: "M4 6.5h16v11H4zM4 10h16M8 14h3",
  },
  {
    href: "/configuracoes/assinatura",
    label: "Assinatura e dados",
    icon: "M7 4h10v16H7zM10 8h4M10 12h4M10 16h2",
  },
];

function NavIcon({ d }: { d: string }) {
  return (
    <span className="nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d={d} />
      </svg>
    </span>
  );
}
const extraCrumbs = [
  { href: "/equipe", label: "Equipe" },
  { href: "/auditoria", label: "Auditoria" },
  { href: "/configuracoes/plano", label: "Plano e consumo" },
  { href: "/configuracoes/cobrancas", label: "Cobranças" },
  { href: "/configuracoes/assinatura", label: "Assinatura e dados" },
  { href: "/configuracoes", label: "Configurações" },
  { href: "/preferencias", label: "Preferências" },
  { href: "/alterar-senha", label: "Trocar senha" },
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
    booting,
    logout,
    reload,
  } = useAppContext();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const userMenu = useRef<HTMLDivElement>(null);
  function closeMenu() {
    setMenuOpen(false);
    menuButton.current?.focus();
  }
  useEffect(() => {
    if (!userMenuOpen) return;
    function onPointer(event: MouseEvent) {
      if (!userMenu.current?.contains(event.target as Node))
        setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [userMenuOpen]);
  useEffect(() => {
    if (menuOpen)
      sidebar.current?.querySelector<HTMLElement>("button, a")?.focus();
  }, [menuOpen]);
  if (booting)
    return (
      <main className="access-required">
        <LoadingState label="Abrindo sua sessão…" />
      </main>
    );
  if (!authenticated)
    return (
      <main className="access-required">
        <h1>Entre para acessar o painel</h1>
        <p>Entre com a conta da academia para continuar.</p>
        <Link className="button button-primary" href="/entrar">
          Ir para entrar
        </Link>
      </main>
    );
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  const roleLabel = membership?.roles.includes("admin")
    ? "Administração"
    : "Profissional";
  return (
    <div
      className="app-shell"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (menuOpen) closeMenu();
        setUserMenuOpen(false);
      }}
    >
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <aside
        ref={sidebar}
        id="navegacao-principal"
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        role={menuOpen ? "dialog" : undefined}
        aria-modal={menuOpen || undefined}
        aria-label={menuOpen ? "Menu principal" : "Navegação administrativa"}
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
        <Link
          className="brand"
          href="/dashboard"
          aria-label="Bota o Shape! · início"
        >
          <img src="/brand/icon.svg" alt="" width={200} height={61} />
        </Link>
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
              <NavIcon d={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Administração e preferências">
          {adminNavigation
            .filter(
              (item) =>
                !item.href.startsWith("/configuracoes/") ||
                item.href === "/configuracoes" ||
                canManageBilling(user, membership, tenant.id),
            )
            .filter(
              (item) =>
                (item.href !== "/equipe" && item.href !== "/auditoria") ||
                membership?.roles.includes("admin"),
            )
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  pathname === item.href ? "page" : undefined
                }
                onClick={() => setMenuOpen(false)}
              >
                <NavIcon d={item.icon} />
                {item.label}
              </Link>
            ))}
        </nav>
        <div className="powered-by">
          <span>Powered by</span>
          <a href="https://henter.com.br" target="_blank" rel="noreferrer">
            Henter Digital Solutions
          </a>
        </div>
      </aside>
      <div className="app-main">
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
          <div className="tenant-switcher">
            <label className="sr-only" htmlFor="active-tenant">
              Academia ativa
            </label>
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
          <NotificationBell />
          <div className="account" ref={userMenu}>
            <button
              className="user-trigger"
              type="button"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              onClick={() => setUserMenuOpen((value) => !value)}
            >
              <span className="avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="user-copy">
                <strong>{user.name}</strong>
                <small>
                  {roleLabel}
                  {mode === "demo" && " · demo"}
                </small>
              </span>
              <span aria-hidden="true">⌄</span>
            </button>
            {userMenuOpen && (
              <div className="account-menu" role="menu">
                <Link
                  href="/preferencias"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Preferências
                </Link>
                <Link
                  href="/alterar-senha"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Trocar senha
                </Link>
                <Link
                  href="/entrar"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false);
                    void logout().catch(() => {});
                  }}
                >
                  Sair
                </Link>
              </div>
            )}
          </div>
        </header>
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
            {[...navigation, ...extraCrumbs].find((item) =>
              pathname.startsWith(item.href),
            )?.label ?? "Visão geral"}
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
      {menuOpen && (
        <button
          className="nav-backdrop"
          aria-label="Fechar menu"
          onClick={closeMenu}
          tabIndex={-1}
        />
      )}
    </div>
  );
}
