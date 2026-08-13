import { ReactNode, useEffect } from "react";
import { useAuthBackoffice } from "./authBackoffice";
import { useUiModeStore } from "../store/uiModeStore";

export function UiModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthBackoffice();

  useEffect(() => {
    useUiModeStore.getState().hydrate(user?.id);
  }, [user?.id]);

  return <>{children}</>;
}
