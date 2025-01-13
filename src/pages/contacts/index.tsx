import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import { mockDataContacts, mockDataTeam } from "../../data/mockData";
import Header from "../../components/Header";
import { Box, Typography, useTheme } from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import { useEffect, useState } from "react";
import { api } from "../../services/api";

interface RowData {
  id: number;
  name: string;
  age: number;
  accessLevel: "admin" | "manager" | "user";
}

const Contacts: React.FC = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Estado para armazenar os dados da API
  const [rows, setRows] = useState<RowData[]>([]);

  const columns = [
    { field: "id", headerName: "ID", flex: 0.5 },
    { field: "userName", headerName: "Nome de Usuário", flex: 1 },
    { field: "name", headerName: "Nome", flex: 1 },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
    },
    {
      field: "created_at",
      headerName: "Data de Criação",
      flex: 1,
      valueFormatter: (params: any) => {
        return new Date(params.value).toLocaleDateString(); // Formata a data
      },
    },
    {
      field: "blocked",
      headerName: "Bloqueado",
      flex: 1,
      renderCell: (params: any) => (params.value ? "Sim" : "Não"),
    },
    { field: "counter", headerName: "Contador", flex: 1 },
    { field: "role", headerName: "Função", flex: 1 },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtendo o JWT token de localStorage
        const token = localStorage.getItem("@backoffice:token");
  
        if (!token) {
          console.error("Token não encontrado!");
          return;
        }
  
        console.log("Token encontrado:", token);
  
        // Adicionando o token ao header da requisição
        const response = await api.get("/graphic", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        console.log("Dados recebidos:", response.data);
  
        // Garantir que os dados recebidos tenham a estrutura esperada
        const formattedRows = response.data.map((item: any, index: number) => ({
          id: index + 1,              // Atribui um ID crescente (começando de 1)
          name: item.name,            // Nome
          userName: item.userName,    // Nome de usuário
          status: item.status,        // Status
          created_at: item.created_at,// Data de criação
          blocked: item.blocked,      // Se está bloqueado ou não
          counter: item.counter,      // Contador
          role: item.role,            // Papel ou função
        }));
  
        setRows(formattedRows); // Atualiza o estado com os dados formatados
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };
  
    fetchData();
  }, []);

  return (
    <Box m="20px">
      <Header title="Usuários" subtitle="Gerenciamento total de usuários" />
      <Box
        m="40px 0 0 0"
        height="75vh"
        sx={{
          "& .MuiDataGrid-root": {
            border: "none",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
          },
          "& .name-column--cell": {
            color: colors.greenAccent[300],
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[400],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[700],
          },
          "& .MuiCheckbox-root": {
            color: `${colors.greenAccent[200]} !important`,
          },
          "& .MuiDataGrid-toolbarContainer .MuiButton-text": {
            color: `${colors.grey[100]} !important`,
          },
        }}
      >
        <DataGrid rows={rows} columns={columns} components={{ Toolbar: GridToolbar }} />
      </Box>
    </Box>
  );
};

export default Contacts;
