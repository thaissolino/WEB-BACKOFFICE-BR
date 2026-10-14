import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useClientAuth } from "../../../hooks/clientAuth";
import PdvShell, { PdvLoading } from "../dashboard/PdvShell";
import "../../gestor/gestao-pages.css";
import "./cadastros.css";

export default function CadastroShell({ children }: { children: ReactNode }) {
  const { client, loadingClient } = useClientAuth();

  if (loadingClient) return <PdvLoading />;
  if (!client) return <Navigate to="/signin/lojista" replace />;

  return <PdvShell variant="form">{children}</PdvShell>;
}

export function CadastroFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  if (pathname.startsWith("/gestao/")) {
    return (
      <div className="gestao-page">
        <div className="gestao-page__inner">{children}</div>
      </div>
    );
  }
  return <CadastroShell>{children}</CadastroShell>;
}
