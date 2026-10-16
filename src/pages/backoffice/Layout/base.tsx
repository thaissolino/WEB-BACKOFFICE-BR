import { useEffect, useState } from "react";
import {
  Box,
  CssBaseline,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { ColorModeContext, useMode } from "../../../theme";
import Topbar from "../../../pages/global/Topbar";
import Sidebar from "../../../pages/global/Sidebar";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUiModeStore } from "../../../store/uiModeStore";
import { PermissionType, usePermissionStore } from "../../../store/permissionsStore";
import { PremiumChrome } from "./PremiumChrome";

function printOnlyAccount(user: { role?: string } | null, permissions: PermissionType | null) {
  if (!user || user.role === "MASTER" || user.role === "ADMIN" || user.role === "ADMIN_BAG") return false;
  if (!permissions?.VENDAS_CONCLUIDAS?.enabled) return false;
  const others = [
    "CRIAR_USUARIO",
    "GERENCIAR_GRUPOS",
    "GERENCIAR_USUARIOS",
    "GERENCIAR_OPERADORES",
    "GERENCIAR_PLANILHAS",
    "GERENCIAR_INVOICES",
    "GERENCIAR_TOKENS",
    "GERENCIAR_BOLETOS",
    "GERENCIAR_OPERACOES",
  ];
  const flags = permissions as Record<string, { enabled?: boolean } | undefined>;
  return !others.some((key) => flags?.[key]?.enabled);
}

function PrintOnlyGate() {
  const location = useLocation();
  const { permissions, user, getPermissions } = usePermissionStore();
  useEffect(() => {
    getPermissions();
  }, [getPermissions]);
  if (!printOnlyAccount(user, permissions)) return null;
  if (location.pathname === "/vendas-concluidas") return null;
  return <Navigate to="/vendas-concluidas" replace />;
}

export function Layout() {
  const [theme, colorMode] = useMode() as [any, any];
  const [isSidebar, setIsSidebar] = useState<boolean>(true);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const location = useLocation();
  const globalMode = useUiModeStore((state) => state.globalMode);
  const routesWithoutTopbar = ["/invoices-management", "/tokens-management", "/spreadsheets",  "/billets-management", "/scanner-billets", "/operators-management", "/operators-management2"];
  const hideTopbar = routesWithoutTopbar.includes(location.pathname);

  if (globalMode === "premium") {
    return (
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <PrintOnlyGate />
          <PremiumChrome />
        </ThemeProvider>
      </ColorModeContext.Provider>
    );
  }

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          className="app"
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            height: "100vh",
            overflow: "hidden",
          }}
        >
          <PrintOnlyGate />
          {!isMobile && <Sidebar isSidebar={isSidebar} />}
          <Box
            className="content"
            sx={{
              flexGrow: 1,
              minWidth: 0,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            {!hideTopbar && <Topbar setIsSidebar={setIsSidebar} />}
            <Outlet />
          </Box>
        </Box>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
