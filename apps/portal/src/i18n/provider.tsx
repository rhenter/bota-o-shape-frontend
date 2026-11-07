"use client";

import { createContext, useContext, type ReactNode } from "react";
import { ptBR, type Messages } from "./pt-BR";

const MessagesContext = createContext<Messages>(ptBR);

export function I18nProvider({ messages, children }: { messages: Messages; children: ReactNode }) {
  return <MessagesContext.Provider value={messages}>{children}</MessagesContext.Provider>;
}

export function useMessages(): Messages {
  return useContext(MessagesContext);
}
