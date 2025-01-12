import { Box, Button, IconButton, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import { mockTransactions } from "../../data/mockData";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import EmailIcon from "@mui/icons-material/Email";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import TrafficIcon from "@mui/icons-material/Traffic";
import Header from "../../components/Header";
import StatBox from "../../components/StatBox";
import PersonIcon from '@mui/icons-material/Person';
import Groups2Icon from '@mui/icons-material/Groups2';

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
         borderRadius={"5px"} m="20px">
      {/* HEADER */}
      <Box
         borderRadius={"5px"} display="flex" justifyContent="space-between" alignItems="center">
        <Header title="BACKOFFICE" subtitle="seja bem vindo ao seu backoffice:" />

        <Box
         borderRadius={"5px"}>
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
      </Box>

      {/* GRID & CHARTS */}
      <Box
         borderRadius={"5px"}
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gridAutoRows="140px"
        gap="20px"
      >
        {/* ROW 1 */}
        <Box
         borderRadius={"5px"}
          gridColumn="span 3"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <StatBox
            title="12,361"
            subtitle="Total de grupos"
            progress="0.75"
            increase="+14%"
            icon={
              <Groups2Icon
                sx={{ color: colors.greenAccent[600], fontSize: "26px" }}
              />
            }
          />
        </Box>
        <Box
         borderRadius={"5px"}
          gridColumn="span 3"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"

        >
          <StatBox
            title="32,441"
            subtitle="Total de usuários"
            progress="0.30"
            increase="+5%"
            icon={
              <PersonIcon
                sx={{ color: colors.greenAccent[600], fontSize: "26px" }}
              />
            }
          />
        </Box>
        <Box
         borderRadius={"5px"}
          gridColumn="span 3"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <StatBox
            title="431,225"
            subtitle="Total de chamadas"
            progress="0.50"
            increase="+21%"
            icon={
              <PointOfSaleIcon
                sx={{ color: colors.greenAccent[600], fontSize: "26px" }}
              />
            }
          />
        </Box>
        
        <Box
         borderRadius={"5px"}
          gridColumn="span 3"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <StatBox
            title="1,325,134"
            subtitle="Total de mensagens"
            progress="0.80"
            increase="+43%"
            icon={
              <EmailIcon
                sx={{ color: colors.greenAccent[600], fontSize: "26px" }}
              />
            }
          />
        </Box>

        {/* ROW 2 */}
        <Box
         borderRadius={"5px"}
          gridColumn="span 8"
          gridRow="span 2"
          backgroundColor={colors.primary[400]}
        >
          <Box
         borderRadius={"5px"}
            mt="25px"
            p="0 30px"
            display="flex "
            justifyContent="space-between"
            alignItems="center"
          >
            <Box
         borderRadius={"5px"}>
              <Typography
                variant="h5"
                fontWeight="600"
                color={colors.grey[100]}
              >
                Alguma metrica aqui
              </Typography>
              <Typography
                variant="h3"
                fontWeight="bold"
                color={colors.greenAccent[500]}
              >
               COLOCAR ALGUMA COISA AQUI APENAS EXEMPLO:
              </Typography>
            </Box>
            <Box
         borderRadius={"5px"}>
              <IconButton>
                <DownloadOutlinedIcon
                  sx={{ fontSize: "26px", color: colors.greenAccent[500] }}
                />
              </IconButton>
            </Box>
          </Box>
          <Box
         borderRadius={"5px"} height="250px" m="-20px 0 0 0">
            {/* <LineChart isDashboard={true} /> */}
          </Box>
        </Box>
        <Box
         borderRadius={"5px"}
          gridColumn="span 4"
          gridRow="span 2"
          backgroundColor={colors.primary[400]}
          overflow="auto"
        >
          <Box
         borderRadius={"5px"}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            borderBottom={`4px solid ${colors.greenAccent[500]}`}
            colors={colors.grey[100]}
            backgroundColor={colors.blueAccent[700]}
            p="15px"
          >
            <Typography color={colors.greenAccent[100]} variant="h5" fontWeight="600">
             Novos Usuários   
            </Typography>
          </Box>
          {mockTransactions.map((transaction, i) => (
            <Box
         borderRadius={"5px"}
              key={`${transaction.txId}-${i}`}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              borderBottom={`4px solid ${colors.primary[500]}`}
              p="15px"
            >
              <Box
         borderRadius={"5px"}>
                <Typography
                  color={colors.greenAccent[500]}
                  variant="h5"
                  fontWeight="600"
                >
                  {transaction.txId}
                </Typography>
                <Typography color={colors.grey[100]}>
                  {transaction.user}
                </Typography>
              </Box>
              <Box
         borderRadius={"5px"} color={colors.grey[100]}>{transaction.date}</Box>
              <Box
         borderRadius={"5px"}
                backgroundColor={colors.greenAccent[500]}
                p="5px 10px"
              >
                {transaction.cost}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
