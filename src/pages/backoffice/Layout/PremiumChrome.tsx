import { useContext, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  DatabaseBackup,
  List,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "@mui/material/styles";
import { ColorModeContext } from "../../../theme";
import { ModesPopover } from "../../../components/ui-mode/ModesPopover";
import { useBackofficeNavItems } from "../../../store/useBackofficeNavItems";
import { api } from "../../../services/api";
import "./premium-chrome.css";

export function PremiumChrome() {
  const { items, roleLabel, onLogout, canBackup, isActive } = useBackofficeNavItems();
  const colorMode = useContext(ColorModeContext);
  const theme = useTheme();
  const isDark = theme.palette.mode !== "light";
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [snapshotEmail, setSnapshotEmail] = useState("");
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [snapshotMessage, setSnapshotMessage] = useState("");

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    onLogout();
    navigate("/");
  }

  async function handleBackup() {
    if (!snapshotEmail.trim()) {
      setSnapshotMessage("Informe um e-mail.");
      return;
    }
    try {
      await api.post("/backoffice/database/create-snapshot-and-send-email", {
        email: snapshotEmail.trim(),
      });
      setSnapshotMessage("Snapshot pedido. Confira o e-mail.");
      setBackupOpen(false);
    } catch {
      setSnapshotMessage("Não foi possível criar o snapshot.");
    }
  }

  async function handleList() {
    try {
      const { data } = await api.get("/backoffice/database/list-snapshots");
      setSnapshots(data.snapshots || []);
      setListOpen(true);
    } catch {
      setSnapshotMessage("Não foi possível listar snapshots.");
    }
  }

  const nav = (
    <aside className="pdv-chrome-aside" aria-label="Navegação do backoffice">
      <div className="pdv-chrome-brand">
        <img
          className="pdv-chrome-avatar"
          alt="profile-user"
          src="/assets/user.png"
          width={72}
          height={72}
        />
        <p className="pdv-chrome-kicker">Gestor · Admin</p>
        <strong>Black Rabbit</strong>
      </div>
      <nav className="pdv-chrome-nav">
        {items.map((item, index) => {
          const showGroup = item.group && item.group !== items[index - 1]?.group;
          return (
            <div key={item.id}>
              {showGroup ? <p className="pdv-chrome-group">{item.group}</p> : null}
              <Link to={item.to} aria-current={isActive(item.to) ? "page" : undefined}>
                {item.label}
              </Link>
            </div>
          );
        })}
        {canBackup ? (
          <div className="pdv-chrome-snapshot">
            <button type="button" onClick={() => setBackupOpen(true)}>
              <DatabaseBackup size={18} aria-hidden />
              Backup BD
            </button>
            <button type="button" onClick={handleList}>
              <List size={18} aria-hidden />
              Listar
            </button>
          </div>
        ) : null}
      </nav>
      <div className="pdv-chrome-foot">
        <p className="pdv-chrome-kicker">{roleLabel}</p>
        <button className="pdv-chrome-tool" type="button" onClick={handleLogout}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  );

  return (
    <div className="pdv-chrome" data-theme={isDark ? "dark" : "light"}>
      <div className="pdv-chrome-menu-desktop">{nav}</div>
      {drawerOpen ? (
        <div className="pdv-chrome-drawer">
          <button
            className="pdv-chrome-scrim"
            type="button"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
          />
          {nav}
        </div>
      ) : null}
      <div className="pdv-chrome-body" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {(
          <header className="pdv-chrome-header">
            <div className="pdv-chrome-header-left">
              <button
                className="pdv-chrome-icon pdv-chrome-mobile-toggle"
                type="button"
                aria-label={drawerOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen((open) => !open)}
              >
                {drawerOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div>
                <p className="pdv-chrome-kicker">Backoffice</p>
                <strong>Painel gestor</strong>
              </div>
            </div>
            <div className="pdv-chrome-header-actions">
              <button
                className="pdv-chrome-icon"
                type="button"
                aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
                onClick={colorMode.toggleColorMode}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button className="pdv-chrome-icon" type="button" aria-label="Notificações">
                <Bell size={18} />
              </button>
              <ModesPopover variant="premium" />
            </div>
          </header>
        )}
        <div className="pdv-chrome-main">
          <Outlet />
        </div>
      </div>

      {backupOpen ? (
        <div className="pdv-chrome-dialog" role="dialog" aria-labelledby="backup-title">
          <div className="pdv-chrome-dialog-card">
            <h2 id="backup-title">Backup do banco</h2>
            <label>
              E-mail para receber o snapshot
              <input
                type="email"
                value={snapshotEmail}
                onChange={(event) => setSnapshotEmail(event.target.value)}
              />
            </label>
            <div className="pdv-chrome-dialog-actions">
              <button className="ghost" type="button" onClick={() => setBackupOpen(false)}>
                Cancelar
              </button>
              <button className="primary" type="button" onClick={handleBackup}>
                Criar snapshot
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {listOpen ? (
        <div className="pdv-chrome-dialog" role="dialog" aria-labelledby="list-title">
          <div className="pdv-chrome-dialog-card">
            <h2 id="list-title">Snapshots</h2>
            {snapshots.length === 0 ? <p>Nenhum snapshot encontrado.</p> : null}
            <ul>
              {snapshots.map((item, index) => (
                <li key={item.name || index}>
                  {item.modifiedFormatted || item.name} — {item.sizeInMB} MB
                </li>
              ))}
            </ul>
            <div className="pdv-chrome-dialog-actions">
              <button className="ghost" type="button" onClick={() => setListOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {snapshotMessage ? (
        <p className="pdv-chrome-kicker" style={{ position: "fixed", bottom: 16, right: 16 }}>
          {snapshotMessage}
        </p>
      ) : null}
    </div>
  );
}
