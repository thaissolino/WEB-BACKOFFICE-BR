import { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
  useTheme,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { tokens } from "../../theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import { useAuthBackoffice } from "../../hooks/authBackoffice";
import { EnhancedModal } from "../../components/modals/harCodedModal";

interface HeaderMenuProps {
  isSidebar?: boolean;
}

const HeaderMenu: React.FC<HeaderMenuProps> = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const { onLogout } = useAuthBackoffice();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      onLogout();
      navigate("/");
    } catch (error) {
      console.error("Erro durante o logout:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setPendingNavigation(null);
  };

  const handleSaveSpreadsheetModal = (value: string, canNavigate: boolean) => {
    setSpreadsheetInput(value);

    if (canNavigate && pendingNavigation) {
      navigate(pendingNavigation);
      setOpenModal(false);
      setPendingNavigation(null);
    } else {
      setShowErrorToast(true);
    }
  };

  return (
    <AppBar position="static" sx={{ background: colors.primary[400] }}>
      <Toolbar>
        <Box display="flex" alignItems="center" flexGrow={1}>
          <IconButton onClick={handleMenuOpen} color="inherit">
            <MenuOutlinedIcon />
          </IconButton>
          <Typography variant="h6" color="inherit">
            Black Rabbit
          </Typography>
        </Box>

        {/* Dropdown Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} sx={{ mt: "45px" }}>
          <MenuItem onClick={handleMenuClose} component={Link} to="/">
            <HomeOutlinedIcon sx={{ mr: 1 }} />
            Menu Principal
          </MenuItem>
          <MenuItem onClick={handleMenuClose} component={Link} to="/create-form-user">
            <PersonAddIcon sx={{ mr: 1 }} />
            Criar Usuário
          </MenuItem>
          <MenuItem onClick={handleMenuClose} component={Link} to="/team">
            <PeopleOutlinedIcon sx={{ mr: 1 }} />
            Gerenciar Grupos
          </MenuItem>
          <MenuItem onClick={handleMenuClose} component={Link} to="/users">
            <PeopleOutlinedIcon sx={{ mr: 1 }} />
            Gerenciar Usuários
          </MenuItem>
          <MenuItem 
            onClick={() => {
              setPendingNavigation("/spreadsheets");
              setOpenModal(true);
              handleMenuClose();
            }}
          >
            <TableChartOutlinedIcon sx={{ mr: 1 }} />
            Gerenciar Planilhas
          </MenuItem>
        </Menu>

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

        {/* Logout Button */}
        <Button color="inherit" onClick={handleLogout} disabled={loading} sx={{ ml: 2 }}>
          {loading ? "Saindo..." : "Sair"}
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default HeaderMenu;