import React, { ReactNode } from "react";
import { AuthBackofficeProvider } from "./authBackoffice";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationProvider } from "./notification";
import { ClientAuthProvider } from "./clientAuth";
import { UiModeProvider } from "./uiMode";

// Aqui, PropsWithChildren define que o componente espera a propriedade children
export const Hooks: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ClientAuthProvider>
      <AuthBackofficeProvider>
        <UiModeProvider>
          <NotificationProvider>
            <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
          </NotificationProvider>
        </UiModeProvider>
      </AuthBackofficeProvider>
    </ClientAuthProvider>
  );
};
