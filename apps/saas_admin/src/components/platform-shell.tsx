"use client";

import Image from "next/image";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useState, type ReactNode} from "react";

import {hasCapability} from "./capability-guard";
import {useAuth} from "./auth-context";
import type {PlatformCapability} from "@/lib/platform-api";

type IconName =
    "home"
    | "user"
    | "info"
    | "shield"
    | "settings"
    | "bell"
    | "team"
    | "law"
    | "dollar"
    | "cashflow"
    | "mail"
    | "audit";
const iconPaths: Record<IconName, string> = {
    home: "M3 11.5 12 4l9 7.5M5 10v10h14V10M9 20v-6h6v6",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
    info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-9h.01",
    shield: "M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-5",
    settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-6v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4",
    bell: "M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4L6 17Zm4 2h4",
    team: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9a6 6 0 0 1 12 0m2-10a2.5 2.5 0 1 0 0-5m-1 9a5 5 0 0 1 5 5",
    law: "M12 4v16M5 7h14M7 7l-3 6a3 3 0 0 0 6 0L7 7Zm10 0-3 6a3 3 0 0 0 6 0l-3-6ZM5 20h14",
    dollar: "M12 3v18m4-14c-.6-1-1.8-1.5-3.5-1.5-2.2 0-3.5 1-3.5 2.5s1.3 2.4 3.5 3 3.5 1.4 3.5 3-1.3 2.5-3.5 2.5c-1.7 0-2.9-.5-3.5-1.5",
    cashflow: "M7 17V4m0 0L3 8m4-4 4 4M17 7v13m0 0-4-4m4 4 4-4",
    mail: "M4 6h16v12H4V6Zm0 1 8 6 8-6",
    audit: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
};

function Icon({name}: { name: IconName }) {
    return <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={iconPaths[name]}/>
    </svg>;
}

type NavItem = {
    href: string;
    label: string;
    icon: IconName;
    capability?: PlatformCapability;
    administratorOnly?: boolean
};
const navigation: NavItem[] = [
    {href: "/dashboard", label: "Visão geral", icon: "home"}, {
        href: "/contas",
        label: "Contas e usuários",
        icon: "user",
        capability: "accounts.read"
    },
    {href: "/assinaturas", label: "Assinaturas", icon: "info", capability: "subscriptions.read"}, {
        href: "/beta",
        label: "Beta testers",
        icon: "shield",
        capability: "accounts.read"
    },
    {href: "/planos", label: "Planos", icon: "settings", capability: "plans.manage"}, {
        href: "/trials-retencao",
        label: "Trials e retenção",
        icon: "bell",
        capability: "accounts.read"
    },
    {href: "/equipe", label: "Equipe e perfis", icon: "team", administratorOnly: true}, {
        href: "/juridico",
        label: "Jurídico",
        icon: "law",
        capability: "legal.manage"
    },
    {href: "/cobrancas", label: "Cobranças", icon: "dollar", capability: "charges.read"}, {
        href: "/recebiveis",
        label: "Recebíveis e repasses",
        icon: "cashflow",
        capability: "finance.read"
    },
    {
        href: "/operacao",
        label: "Operação e alertas",
        icon: "bell",
        capability: "operations.read"
    }, {href: "/integracoes", label: "Integrações", icon: "settings", capability: "integrations.manage"},
    {
        href: "/faq",
        label: "Perguntas frequentes",
        icon: "info",
        capability: "support.manage"
    }, {href: "/contato-suporte", label: "WhatsApp / contato", icon: "mail", capability: "support.manage"},
    {href: "/suporte", label: "Atendimento", icon: "team", capability: "support.manage"}, {
        href: "/contatos",
        label: "Contatos",
        icon: "mail",
        capability: "support.manage"
    },
    {href: "/auditoria", label: "Auditoria", icon: "audit", capability: "audit.read"},
];

export function PlatformShell({children}: { children: ReactNode }) {
    const {ready, membership, logout} = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    if (!ready) return <main className="centered-state">Validando sessão segura…</main>;
    if (!membership) return <main className="centered-state"><p className="eyebrow">SaaS Admin</p><h1>Entre para operar
        a plataforma</h1><p>Sua sessão não é compartilhada com o painel das academias.</p><Link
        className="button button-primary" href="/entrar">Ir para o login</Link></main>;
    const visible = navigation.filter((item) => (!item.administratorOnly || membership.role === "administrator") && (!item.capability || hasCapability(membership, item.capability)));
    const displayName = membership.name || membership.email;
    const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    return <div className="shell"><a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
        <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`} aria-label="Navegação da plataforma"><Link
            className="brand" href="/dashboard" aria-label="Bota o Shape! — Administração"><Image
            src="/brand/icon.svg" alt="Bota o Shape!" width={1536} height={1024} priority/></Link>
            <nav>{visible.map((item) => <Link key={item.href} href={item.href}
                                              aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
                                              onClick={() => setSidebarOpen(false)}><Icon
                name={item.icon}/><span>{item.label}</span></Link>)}</nav>
            <div className="sidebar-footer"><p>Powered by <strong>Henter Digital Solutions</strong></p>
                <details className="user-menu">
                    <summary><span
                        className="avatar">{initials}</span><span><strong>{displayName}</strong><small>{membership.role === "administrator" ? "Administrador" : "Operador"}</small></span><b
                        aria-hidden="true">⌃</b></summary>
                    <div><Link href="/preferencias"><Icon name="settings"/>Preferências</Link><Link
                        href="/seguranca"><Icon name="shield"/>Segurança</Link>
                        <button type="button" onClick={() => void logout().finally(() => router.replace("/entrar"))}>
                            <Icon name="user"/>Sair
                        </button>
                    </div>
                </details>
            </div>
        </aside>
        <header className="topbar">
            <button className="menu-button" type="button" aria-label="Abrir navegação"
                    onClick={() => setSidebarOpen(true)}>☰
            </button>
            <div><strong>Administração da plataforma</strong><span>Bota o Shape!</span></div>
            <Link className="notification-button" href="/operacao" aria-label="Ver alertas"><Icon name="bell"/></Link>
        </header>
        <main id="conteudo" className="content" tabIndex={-1}>{children}</main>
        {sidebarOpen &&
            <button className="backdrop" aria-label="Fechar navegação" onClick={() => setSidebarOpen(false)}/>}</div>;
}
