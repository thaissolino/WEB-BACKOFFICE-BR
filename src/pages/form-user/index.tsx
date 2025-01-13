import { Box, Button, TextField } from "@mui/material";
import { Formik, FormikHelpers } from "formik";
import * as yup from "yup";
import useMediaQuery from "@mui/material/useMediaQuery";
import Header from "../../components/Header";
import { api } from "../../services/api";

interface FormValues {
  name: string;
  userName: string;
  hardPassword: string;
  password: string;
  confirmPassword: string;
}

const FormUser = () => {
  const isNonMobile = useMediaQuery("(min-width:600px)");

  // Função para gerar valores aleatórios
  const generateRandomPassword = () => Math.random().toString(36).slice(-8); // Gera uma senha aleatória
  const generateRandomNickname = () => `@${Math.random().toString(36).slice(2, 8)}`; // Gera um apelido aleatório

  const handleFormSubmit = async (values: FormValues) => {
    try {
      // Prepare the payload
      const payload = {
        name: values.name,
        userName: values.userName,
        hardPassword: values.hardPassword,
        password_hash: values.password, // Aqui você pode passar o valor do hash real ou gerar o hash
      };

      // Realiza a requisição POST com o Axios
      const response = await api.post("/graphic/create", payload);

      // Aqui você pode tratar a resposta
      console.log("Usuário criado com sucesso:", response.data);
    } catch (error) {
      // Se ocorrer algum erro durante a requisição
      console.error("Erro ao criar usuário:", error);
    }
  };

  const checkoutSchema = yup.object().shape({
    name: yup.string().required("Nome é obrigatório"),
    userName: yup
      .string()
      .matches(/^[a-zA-Z0-9_@.\-]+$/, "O nome de usuário deve conter apenas letras, números, underscores, @, . e - sem espaços")
      .required("Nome de usuário é obrigatório"),
    hardPassword: yup.string().required("obrigatório"),
    password: yup.string().required("A senha é obrigatória"),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref("password"), null], "As senhas devem coincidir")
      .required("Confirmar senha é obrigatório"),
  });

  const initialValues: FormValues = {
    name: "",
    hardPassword: "",
    userName: "",
    password: "",
    confirmPassword: "",
  };

  return (
    <Box m="20px">
      <Header title="Novo usuário:" subtitle="Crie um novo perfil de usuário" />

      <Formik
        initialValues={initialValues}
        validationSchema={checkoutSchema}
        onSubmit={handleFormSubmit}
      >
        {({ values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue }: any) => (
          <form onSubmit={handleSubmit}>
            <Box
              display="grid"
              gap="30px"
              gridTemplateColumns="repeat(4, minmax(0, 1fr))"
              sx={{
                "& > div": { gridColumn: isNonMobile ? undefined : "span 4" },
              }}
            >
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Nome"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.name}
                name="name"
                error={!!touched.name && !!errors.name}
                helperText={touched.name && errors.name}
                sx={{ gridColumn: "span 2" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Apelido"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.userName}
                name="userName"
                error={!!touched.userName && !!errors.userName}
                helperText={touched.userName && errors.userName}
                sx={{ gridColumn: "span 2" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Excluir Dados com Senha"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.hardPassword}
                name="hardPassword"
                error={!!touched.hardPassword && !!errors.hardPassword}
                helperText={touched.hardPassword && errors.hardPassword}
                sx={{ gridColumn: "span 4" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Senha"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.password}
                name="password"
                error={!!touched.password && !!errors.password}
                helperText={touched.password && errors.password}
                sx={{ gridColumn: "span 4" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Confirmar Senha"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.confirmPassword}
                name="confirmPassword"
                error={!!touched.confirmPassword && !!errors.confirmPassword}
                helperText={touched.confirmPassword && errors.confirmPassword}
                sx={{ gridColumn: "span 4" }}
              />
            </Box>
            <Box display="flex" justifyContent="space-between" gap="20px" mt="20px">
              <Box display="flex" gap="20px">
                <Button
                  onClick={() => {
                    const randomPassword = generateRandomPassword();
                    setFieldValue("password", randomPassword);         // Preencher o campo de senha
                    setFieldValue("confirmPassword", randomPassword);
                  }} 
                  color="primary" 
                  variant="contained"
                >
                  Gerar Senha
                </Button>
                <Button
                  onClick={() => setFieldValue("hardPassword", generateRandomPassword())} 
                  color="primary" 
                  variant="contained"
                >
                  Gerar Senha de Exclusão
                </Button>
                <Button
                  onClick={() => setFieldValue("userName", generateRandomNickname())} 
                  color="primary" 
                  variant="contained"
                >
                  Gerar Apelido
                </Button>
              </Box>
              <Box display="flex" justifyContent="flex-end">
                <Button type="submit" color="success" variant="contained">
                  Criar usuário
                </Button>
              </Box>
            </Box>
          </form>
        )}
      </Formik>
    </Box>
  );
};

export default FormUser;
