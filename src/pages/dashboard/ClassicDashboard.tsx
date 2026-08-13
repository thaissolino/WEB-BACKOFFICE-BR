import { Box, Button, IconButton, Typography, useMediaQuery, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import EmailIcon from "@mui/icons-material/Email";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import Header from "../../components/Header";
import StatBox from "../../components/StatBox";
import PersonIcon from "@mui/icons-material/Person";
import Groups2Icon from "@mui/icons-material/Groups2";
import { formatUserName, useDashboardData } from "./useDashboardData";

export default function ClassicDashboard() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user, users, totalUsuarios, totalGrupos, totalChamadas, totalMensagens } = useDashboardData();

  return (
    <Box borderRadius={"5px"} m="20px">
      <Box borderRadius={"5px"} display="flex" justifyContent="space-between" alignItems="center">
        <Header
          title={isMobile ? formatUserName(user?.name || "") : "BACKOFFICE"}
          subtitle="seja bem vindo ao seu backoffice:"
        />

        {!isMobile ? (
          <Box borderRadius={"5px"}>
            <Button
              sx={{
                backgroundColor: colors.blueAccent[700],
                color: colors.grey[100],
                fontSize: "14px",
                fontWeight: "bold",
                padding: "10px 20px",
              }}
            >
              <DownloadOutlinedIcon sx={{ mr: "10px" }} />
              Download de alguma coisa
            </Button>
          </Box>
        ) : null}
      </Box>

      <Box
        borderRadius={"5px"}
        display="grid"
        gridTemplateColumns={isMobile ? "repeat(6, 1fr)" : "repeat(12, 1fr)"}
        gridAutoRows="140px"
        gap="20px"
      >
        <Box
          borderRadius={"5px"}
          gridColumn={!isMobile ? "span 3" : "span 3"}
          sx={{
            backgroundColor: colors.primary[400],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StatBox
            title={totalGrupos.toString()}
            subtitle="Total de grupos"
            progress="0.75"
            increase="+14%"
            icon={<Groups2Icon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>
        <Box
          borderRadius={"5px"}
          gridColumn={!isMobile ? "span 3" : "span 3"}
          sx={{
            backgroundColor: colors.primary[400],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StatBox
            title={totalUsuarios.toString()}
            subtitle="Total de usuários"
            progress="0.30"
            increase="+5%"
            icon={<PersonIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>
        <Box
          borderRadius={"5px"}
          gridColumn={!isMobile ? "span 3" : "span 3"}
          sx={{
            backgroundColor: colors.primary[400],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StatBox
            title={totalChamadas}
            subtitle="Total de chamadas"
            progress="0.50"
            increase="+21%"
            icon={<PointOfSaleIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>
        <Box
          borderRadius={"5px"}
          gridColumn={!isMobile ? "span 3" : "span 3"}
          sx={{
            backgroundColor: colors.primary[400],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StatBox
            title={totalMensagens}
            subtitle="Total de mensagens"
            progress="0.80"
            increase="+43%"
            icon={<EmailIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>
        {!isMobile ? (
          <Box
            borderRadius={"5px"}
            gridColumn="span 8"
            gridRow="span 2"
            sx={{ backgroundColor: colors.primary[400] }}
          >
            <Box
              borderRadius={"5px"}
              mt="25px"
              p="0 30px"
              display="flex "
              justifyContent="space-between"
              alignItems="center"
            >
              <Box borderRadius={"5px"}>
                <Typography variant="h5" fontWeight="600" color={colors.grey[100]}>
                  Alguma metrica aqui
                </Typography>
                <Typography variant="h3" fontWeight="bold" color={colors.greenAccent[500]}>
                  COLOCAR ALGUMA COISA AQUI APENAS EXEMPLO:
                </Typography>
              </Box>
              <Box borderRadius={"5px"}>
                <IconButton>
                  <DownloadOutlinedIcon sx={{ fontSize: "26px", color: colors.greenAccent[500] }} />
                </IconButton>
              </Box>
            </Box>
            <Box borderRadius={"5px"} height="250px" m="-20px 0 0 0" />
          </Box>
        ) : null}

        <Box
          gridColumn={isMobile ? "span 6" : "span 4"}
          borderRadius={"5px"}
          gridRow="span 2"
          sx={{ backgroundColor: colors.primary[400] }}
          overflow="auto"
        >
          <Box
            borderRadius="5px"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              borderBottom: `4px solid ${colors.greenAccent[500]}`,
              color: colors.grey[100],
              backgroundColor: colors.blueAccent[700],
              p: "15px",
            }}
          >
            <Typography color={colors.greenAccent[100]} variant="h5" fontWeight="600">
              Novos Usuários
            </Typography>
          </Box>
          {users.map((account) => (
            <Box
              borderRadius={"5px"}
              key={`${account.id}`}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              borderBottom={`4px solid ${colors.primary[500]}`}
              p="15px"
              gap="80px"
              sx={{ "&:hover": { backgroundColor: colors.blueAccent[400] } }}
            >
              <Box
                borderRadius={"5px"}
                flex="1"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                <Typography color={colors.greenAccent[500]} variant="h5" fontWeight="600">
                  {account.userName}
                </Typography>
                <Typography color={colors.grey[100]}>{account.name}</Typography>
              </Box>
              <Box
                borderRadius={"5px"}
                color={colors.grey[100]}
                display="flex"
                justifyContent="center"
                alignItems="center"
                flexShrink={0}
              >
                {new Date(account.created_at).toLocaleDateString()}
              </Box>
              <Box
                borderRadius={"5px"}
                flexShrink={0}
                sx={{ backgroundColor: colors.greenAccent[500] }}
                p="5px 10px"
              >
                <Typography color={colors.grey[100]}>
                  {account.status === "active" ? "Ativo" : "Inativo"}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
