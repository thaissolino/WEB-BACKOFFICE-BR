import type React from "react";

import { useState } from "react";
import { ProSidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Box, Button, IconButton, Typography, useTheme, Snackbar, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom"; // Removido o import do Link
import "react-pro-sidebar/dist/css/styles.css";
import { tokens } from "../../theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useAuthBackoffice } from "../../hooks/authBackoffice";
import { EnhancedModal } from "../../components/modals/harCodedModal";

interface SidebarProps {
  isSidebar?: boolean;
}

interface ItemProps {
  title: string;
  to: string;
  icon: React.ReactNode;
  selected: string;
  setSelected: (value: string) => void;
  requiresValidation?: boolean; // Nova prop para indicar se o item requer validação
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebar }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const { onLogout } = useAuthBackoffice();

  // Monitor selected state to open modal when "Gerenciar Planilhas" is selected
  const [selected, setSelected] = useState("Dashboard");

  // Componente Item modificado para estar dentro do Sidebar e ter acesso ao estado
  const Item: React.FC<ItemProps> = ({ title, to, icon, selected, setSelected, requiresValidation = false }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const handleClick = () => {
      setSelected(title);

      if (requiresValidation) {
        // Se requer validação, armazena a rota pendente e abre o modal
        setPendingNavigation(to);
        setOpenModal(true);
      } else {
        // Se não requer validação, navega diretamente
        navigate(to);
      }
    };

    return (
      <MenuItem
        active={selected === title}
        style={{
          color: colors.grey[100],
        }}
        onClick={handleClick}
        icon={icon}
      >
        <Typography>{title}</Typography>
      </MenuItem>
    );
  };

  const handleSaveSpreadsheetModal = (value: string, canNavigate: boolean) => {
    // Store the input value regardless of navigation
    setSpreadsheetInput(value);

    // Only navigate if explicitly allowed by the API response
    if (canNavigate && pendingNavigation) {
      navigate(pendingNavigation);
      setOpenModal(false);
      setPendingNavigation(null);
    } else {
      // Show toast error if we can't navigate
      setShowErrorToast(true);
      // Keep the modal open to allow the user to try again
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setPendingNavigation(null);
    // Reset selection to Dashboard when modal is closed without saving
    if (selected === "Gerenciar Planilhas") {
      setSelected("Dashboard");
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Aguardar 3 segundos antes de chamar o onLogout
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Executar o logout após o delay
      onLogout();

      console.log("Logout realizado com sucesso.");

      // Redireciona após o logout
      navigate("/");
    } catch (error) {
      console.error("Erro durante o logout:", error);
    } finally {
      setLoading(false);
    }
  };

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Box
      sx={{
        "& .pro-sidebar-inner": {
          background: `${colors.primary[400]} !important`,
        },
        "& .pro-icon-wrapper": {
          backgroundColor: "transparent !important",
        },
        "& .pro-inner-item": {
          padding: "5px 25px 5px 20px !important",
        },
        "& .pro-inner-item:hover": {
          color: "#868dfb !important",
        },
        "& .pro-menu-item.active": {
          color: "#6870fa !important",
        },
      }}
    >
      <ProSidebar collapsed={isCollapsed}>
        <Menu iconShape="square">
          {/* LOGO AND MENU ICON */}
          <MenuItem
            onClick={() => setIsCollapsed(!isCollapsed)}
            icon={isCollapsed ? <MenuOutlinedIcon /> : undefined}
            style={{
              margin: "10px 0 20px 0",
              color: colors.grey[100],
            }}
          >
            {!isCollapsed && (
              <Box display="flex" justifyContent="center" alignItems="center" ml="3.4375rem" gap="0.5rem">
                <Typography variant="h3" color={colors.grey[300]}>
                  Black Rabbit
                </Typography>
                <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
                  <MenuOutlinedIcon />
                </IconButton>
              </Box>
            )}
          </MenuItem>

          {!isCollapsed && (
            <Box mb="25px">
              <Box display="flex" justifyContent="center" alignItems="center">
                <img
                  alt="profile-user"
                  width="100px"
                  height="100px"
                  src={`../../assets/user.png`}
                  style={{ cursor: "pointer", borderRadius: "50%" }}
                />
              </Box>
              <Box textAlign="center">
                <Typography variant="h2" color={colors.grey[100]} fontWeight="bold" sx={{ m: "10px 0 0 0" }}>
                  Ed Rocha
                </Typography>
                <Typography variant="h5" color={colors.greenAccent[500]}>
                  VP Administrador
                </Typography>
              </Box>
            </Box>
          )}

          <Box paddingLeft={isCollapsed ? undefined : "10%"}>
            <Item
              title="Menu Principal"
              to="/"
              icon={<HomeOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />

            {!isCollapsed && (
              <Typography variant="h6" color={colors.greenAccent[300]} sx={{ m: "15px 0 5px 20px" }}>
                Novo Cadastro:
              </Typography>
            )}
            <Item
              title="Criar Usuário"
              to="/create-form-user"
              icon={<PersonAddIcon />}
              selected={selected}
              setSelected={setSelected}
            />

            {!isCollapsed && (
              <Typography variant="h6" color={colors.greenAccent[300]} sx={{ m: "15px 0 5px 20px" }}>
                Usuário/Grupo
              </Typography>
            )}
            <Item
              title="Gerenciar Grupos"
              to="/team"
              icon={<PeopleOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />
            <Item
              title="Gerenciar Usuários"
              to="/users"
              icon={<PersonOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />

            {!isCollapsed && (
              <Typography variant="h6" color={colors.greenAccent[300]} sx={{ m: "15px 0 5px 20px" }}>
                Planilhas:
              </Typography>
            )}
            {/* Este item agora requer validação */}
            <Item
              title="Gerenciar Planilhas"
              to="/spreadsheets"
              icon={<TableChartOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
              requiresValidation={true}
            />

            {/* Enhanced Modal Component */}
            <EnhancedModal
              open={openModal}
              onClose={handleCloseModal}
              onSave={handleSaveSpreadsheetModal}
              title="Digite a senha de acesso"
              label="Code"
            />

            {/* Error Toast */}
            <Snackbar
              open={showErrorToast}
              autoHideDuration={6000}
              onClose={() => setShowErrorToast(false)}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
              <Alert onClose={() => setShowErrorToast(false)} severity="error" sx={{ width: "100%" }}>
                Não foi possível acessar a planilha. Verifique o valor inserido.
              </Alert>
            </Snackbar>

            {/* Barra Superior com Botão de Sair */}
            {!isCollapsed && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mt: "160px",
                  mb: "20px",
                  ml: "-20px",
                  width: "100%",
                }}
              >
                <Button
                  type="submit"
                  color="success"
                  variant="contained"
                  disabled={loading}
                  onClick={handleLogout}
                  className="flex items-center text-red-600 hover:text-red-800 focus:outline-none"
                >
                  {/* Ícone de Seta ou Porta */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12H3m12 0l-4-4m4 4l-4 4m11-6v7a2 2 0 01-2 2H7m14-9h-7"
                    />
                  </svg>
                  Sair
                </Button>
              </Box>
            )}
          </Box>
        </Menu>
      </ProSidebar>
    </Box>
  );
};

export default Sidebar;
