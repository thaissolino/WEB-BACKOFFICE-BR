import { useState } from "react";
import { ProSidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Box, Button, IconButton, Typography, useTheme } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import "react-pro-sidebar/dist/css/styles.css";
import { tokens } from "../../theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useAuthBackoffice } from "../../hooks/authBackoffice";

interface SidebarProps {
  isSidebar?: boolean; // Coloque `?` se a propriedade for opcional
}

interface ItemProps {
  title: string; // Título do item, deve ser uma string
  to: string; // Link para redirecionamento
  icon: React.ReactNode; // Ícone do item, pode ser qualquer elemento React
  selected: string; // Item atualmente selecionado, do tipo string
  setSelected: (value: string) => void; // Função para atualizar o item selecionado
}

const Item: React.FC<ItemProps> = ({ title, to, icon, selected, setSelected }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <MenuItem
      active={selected === title}
      style={{
        color: colors.grey[100],
      }}
      onClick={() => setSelected(title)}
      icon={icon}
    >
      <Typography>{title}</Typography>
      <Link to={to} />
    </MenuItem>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isSidebar }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false); // Estado para controlar o loading
  const { onLogout } = useAuthBackoffice(); // Acessando o contexto

 const handleLogout = async () => {
  setLoading(true); // Ativar o loading
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
    setLoading(false); // Desativar o loading
  }
};

  

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selected, setSelected] = useState("Dashboard");

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
            {/* <Item
              title="Criar Sala 1x1"
              to="/create-form-room"
              icon={<PeopleIcon />}
              selected={selected}
              setSelected={setSelected}
            /> */}
            {/* <Item
              title="Criar Grupo"
              to="/create-form-group"
              icon={<GroupAddIcon />}
              selected={selected}
              setSelected={setSelected}
            /> */}
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
           
            {/* <Item
              title="Gerenciar Room 1x1"
              to="/invoices"
              icon={<ContactsOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            /> */}

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
                disabled={loading} // Desabilita o botão durante o carregamento
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
