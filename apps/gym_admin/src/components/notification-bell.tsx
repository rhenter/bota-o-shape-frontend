"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiNotification } from "@/lib/api-client";
import { useAppContext } from "./app-context";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function NotificationBell() {
  const { api, mode, authenticated } = useAppContext();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);

  async function load(nextOffset = 0, append = false) {
    if (mode !== "api" || !authenticated) return;
    setLoading(true);
    setError("");
    try {
      const [page, unreadCount] = await Promise.all([
        api.getNotifications(nextOffset),
        api.getUnreadNotificationCount(),
      ]);
      setItems((current) =>
        append ? [...current, ...page.results] : page.results,
      );
      setTotal(page.count);
      setOffset(nextOffset);
      setUnread(unreadCount);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível carregar as notificações.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode !== "api" || !authenticated) return;
    void load(0);
    const timer = window.setInterval(() => void load(0), 60_000);
    return () => window.clearInterval(timer);
    // Reload when the signed-in session changes. load closes over the client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, authenticated, mode]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(item: ApiNotification) {
    if (item.is_read || mode !== "api") return;
    setItems((current) =>
      current.map((entry) =>
        entry.code === item.code ? { ...entry, is_read: true } : entry,
      ),
    );
    setUnread((count) => Math.max(0, count - 1));
    try {
      await api.markNotificationRead(item.code);
    } catch {
      setItems((current) =>
        current.map((entry) =>
          entry.code === item.code ? { ...entry, is_read: false } : entry,
        ),
      );
      setUnread((count) => count + 1);
    }
  }

  const badge = unread > 99 ? "99+" : String(unread);
  return (
    <div className="notification-bell" ref={root}>
      <button
        className="notification-button"
        type="button"
        aria-label="Últimas notificações"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon />
        {unread > 0 && (
          <span
            className="notification-badge"
            aria-label={`${unread} notificações não lidas`}
          >
            {badge}
          </span>
        )}
      </button>
      {open && (
        <section className="notification-panel" role="dialog" aria-label="Notificações">
          <header>
            <h2>Notificações</h2>
            <small>
              {mode === "demo"
                ? "Ambiente de demonstração"
                : unread > 0
                  ? `${unread} não ${unread === 1 ? "lida" : "lidas"}`
                  : "Tudo em dia"}
            </small>
          </header>
          <div className="notification-list">
            {mode === "demo" && (
              <p className="notification-state">
                Nenhuma notificação da sua conta neste ambiente.
              </p>
            )}
            {mode === "api" && loading && items.length === 0 && (
              <p className="notification-state">Carregando notificações…</p>
            )}
            {mode === "api" && error && (
              <div className="notification-state">
                <p>{error}</p>
                <button type="button" onClick={() => void load(0)}>
                  Tentar novamente
                </button>
              </div>
            )}
            {mode === "api" && !loading && !error && items.length === 0 && (
              <p className="notification-state">Nenhuma notificação.</p>
            )}
            {items.map((item) => (
              <button
                key={item.code}
                type="button"
                className={`notification-item${item.is_read ? "" : " is-unread"}`}
                onClick={() => void markRead(item)}
              >
                <span className="notification-item-icon" aria-hidden="true">
                  <BellIcon />
                </span>
                <span>
                  <strong>
                    {item.subject ||
                      item.notification_type_display ||
                      "Notificação"}
                  </strong>
                  <p>{item.message}</p>
                  <small>{formatWhen(item.created_at)}</small>
                </span>
              </button>
            ))}
          </div>
          {mode === "api" && items.length < total && (
            <button
              className="notification-more"
              type="button"
              disabled={loading}
              onClick={() => void load(offset + 10, true)}
            >
              {loading ? "Carregando…" : "Carregar mais"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
