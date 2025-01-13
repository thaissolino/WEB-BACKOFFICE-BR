import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import { mockDataContacts, mockDataTeam } from "../../data/mockData";
import Header from "../../components/Header";
import { Alert, Box, Button, Snackbar, Typography, useTheme } from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import DeleteIcon from "@mui/icons-material/Delete";

interface RowData {
  userName: string;
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
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"error" | "success" | "info" | "warning">("info"); // Define um valor padrão

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
    {
      field: "action",
      headerName: "Ação",
      flex: 1,
      renderCell: (params: any) => (
        <Box
          width="60%"
          m="0 auto"
          p="5px"
          display="flex"
          justifyContent="center"
          // backgroundColor={
          //   params.row.accessLevel === "admin"
          //     ? colors.greenAccent[600]
          //     : params.row.accessLevel === "manager"
          //     ? colors.greenAccent[700]
          //     : colors.greenAccent[700]
          // }
          sx={{ cursor: "pointer",
            backgroundColor: "red",
           }}
          borderRadius="4px"
        >     
         <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => handleDelete(params.row.userName)} // Passa o userName da linha
          // Passa o ID ou userName
        >
          Excluir
        </Button>
        </Box>
      ),
    },
  ];


  const handleClose = () => {
    setOpen(false);
  };


 // Função que será chamada ao clicar no botão de delete
 const handleDelete = async (userName: string) => {
  try {
      // Obtendo o JWT token de localStorage
      const token = localStorage.getItem("@backoffice:token");
  
      if (!token) {
        console.error("Token não encontrado!");
        return;
      }

      console.log("Token encontrado:", token);

      // Adicionando o token ao header da requisição
    const response = await api.delete("/graphic/delete", {
      data: { userName },  // Passando apenas o userName para o backend
        headers: {
          Authorization: `Bearer ${token}`,
        },
      
   
    },
  );

  console.log("Usuário excluído com sucesso:", response.data);

  // Atualiza a lista de usuários ou remove o usuário da interface
  setRows((prevRows) => prevRows.filter((row) => row.userName !== userName));

  // Realizar a exclusão
  setMessage(`Usuário ${userName} excluído com sucesso.`);
  setSeverity("success");
  setOpen(true);
} catch (error) {
  setMessage(`Erro ao excluir o usuário ${userName}.`);
      setSeverity("error");
      setOpen(true);
}
};

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
          role: (item.role === "MANAGER" ? "LíDER DE GRUPOS" : "USUÁRIO")   // Papel ou função
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
       {/* Exibindo a mensagem de sucesso ou erro */}
       {message && (
         <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
         <Alert onClose={handleClose} severity={severity} sx={{ width: "100%", color: "black", fontSize: "1rem", fontWeight: "bold",  backgroundColor: `${severity === "success" ? colors.greenAccent[700] : colors.redAccent[700]}` }}>
           {message}
         </Alert>
       </Snackbar>
      )}
    </Box>
  );
};

export default Contacts;
