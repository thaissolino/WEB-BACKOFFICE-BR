import React from "react";
import { AuthBackofficeProvider } from "./authBackoffice";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const Hooks: React.FC = ({ children }) => {
  return (
      <AuthBackofficeProvider>
        <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
      </AuthBackofficeProvider>
  );
};
