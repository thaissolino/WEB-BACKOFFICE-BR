import { ReactNode } from "react";
import { AuthSplitLayout } from "../../auth-split/AuthSplitLayout";
import "./vitrine.css";

type VitrineAuthLayoutProps = {
  title: string;
  lede: string;
  children: ReactNode;
};

export function VitrineAuthLayout({ title, lede, children }: VitrineAuthLayoutProps) {
  return (
    <AuthSplitLayout className="vitrine-root" skipHref="#vitrine-main" mainId="vitrine-main">
      <p className="vitrine-kicker vitrine-kicker-sheet">ACESSO DO LOJISTA</p>
      <h1 className="vitrine-title">{title}</h1>
      <p className="vitrine-lede">{lede}</p>
      {children}
    </AuthSplitLayout>
  );
}
