import React, { ReactNode } from "react";
import { AuthBackofficeProvider } from "./authBackoffice";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Aqui, PropsWithChildren define que o componente espera a propriedade children
export const Hooks: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AuthBackofficeProvider>
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    </AuthBackofficeProvider>
  );
};
