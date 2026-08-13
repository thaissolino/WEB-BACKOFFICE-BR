import { useState } from "react";
import {
  Box,
  CssBaseline,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { ColorModeContext, useMode } from "../../../theme";
import Topbar from "../../../pages/global/Topbar";
import Sidebar from "../../../pages/global/Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useUiModeStore } from "../../../store/uiModeStore";
import { PremiumChrome } from "./PremiumChrome";

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
          {!isMobile && <Sidebar isSidebar={isSidebar} />}
          <Box
            className="content"
            sx={{
              flexGrow: 1,
              overflow: "auto",
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
