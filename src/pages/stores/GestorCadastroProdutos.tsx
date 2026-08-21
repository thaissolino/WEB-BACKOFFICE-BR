import { useEffect, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  useTheme,
} from "@mui/material";
import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import { api } from "../../services/api";
import { tokens } from "../../theme";
import PremiumStoreDetail from "./PremiumStoreDetail";
import StoreDetailClassic from "./StoreDetailClassic";
import type { Store } from "./types";

export default function GestorCadastroProdutos() {
  const premium = usePremiumPage("gestorCadastroProdutos");
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");

  useEffect(() => {
    api
      .get("/backoffice/stores")
      .then(({ data }) => {
        const list = (data.stores || []) as Store[];
        setStores(list);
        setStoreId((current) => current || list[0]?.id || "");
      })
      .catch(() => setStores([]));
  }, []);

  return (
    <Box>
      <Box
        m="20px"
        mb={0}
        display="flex"
        gap={2}
        alignItems="center"
        flexWrap="wrap"
        sx={premium ? { m: "12px 16px 0", color: "inherit" } : undefined}
      >
        {!premium ? (
          <Typography variant="h3" fontWeight={700} color={colors.grey[100]}>
            Cadastro produtos
          </Typography>
        ) : (
          <Typography variant="h5" fontWeight={700}>
            Cadastro produtos
          </Typography>
        )}
        <FormControl size="small" variant="filled" sx={{ minWidth: 260 }}>
          <InputLabel>Loja</InputLabel>
          <Select
            value={storeId}
            label="Loja"
            onChange={(event) => setStoreId(String(event.target.value))}
          >
            {stores.map((store) => (
              <MenuItem key={store.id} value={store.id}>
                {store.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {storeId ? (
        premium ? <PremiumStoreDetail storeId={storeId} /> : <StoreDetailClassic storeId={storeId} />
      ) : (
        <Box m="20px">
          <Typography color={colors.grey[300]}>
            Nenhuma loja cadastrada. Cadastre um lojista primeiro em Cadastro lojistas.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
