import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Topbar from "../Layout/scenes/global/Topbar";
import Sidebar from "../Layout/scenes/global/Sidebar";
import Dashboard from "../Layout/scenes/dashboard";
import Team from "../Layout/scenes/team";
import Invoices from "../Layout/scenes/invoices";
import Contacts from "../Layout/scenes/contacts";
import Bar from "../Layout/scenes/bar";
import Form from "../Layout/scenes/form-user";
import Line from "../Layout/scenes/line";
import Pie from "../Layout/scenes/pie";
import FAQ from "../Layout/scenes/faq";
import Geography from "../Layout/scenes/geography";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "src/theme";
import Calendar from "../Layout/scenes/calendar/calendar";

function BackofficeLayout() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="app">
          <Sidebar isSidebar={isSidebar} />
          <main className="content">
            <Topbar setIsSidebar={setIsSidebar} />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/team" element={<Team />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/form" element={<Form />} />
              <Route path="/bar" element={<Bar />} />
              <Route path="/pie" element={<Pie />} />
              <Route path="/line" element={<Line />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/geography" element={<Geography />} />
            </Routes>
          </main>
        </div>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default BackofficeLayout;
