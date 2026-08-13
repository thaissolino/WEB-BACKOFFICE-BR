import { ReactNode, useEffect } from "react";
import { isPremiumEnabled, type PageModeKey } from "../../store/uiMode";
import { useUiModeStore } from "../../store/uiModeStore";
import "./premium-pages.css";

export function usePremiumPage(page: PageModeKey) {
  return useUiModeStore((state) => isPremiumEnabled(state, page));
}

export function PremiumPageShell({ page, children }: { page: PageModeKey; children: ReactNode }) {
  const premium = usePremiumPage(page);

  useEffect(() => {
    if (!premium) return;
    document.body.classList.add("pdv-premium");
    return () => document.body.classList.remove("pdv-premium");
  }, [premium]);

  if (!premium) return <>{children}</>;
  return <div className="pdv-page">{children}</div>;
}
