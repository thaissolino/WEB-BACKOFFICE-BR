import { Box, Button, TextField } from "@mui/material";
import { Formik } from "formik";
import * as yup from "yup";
import useMediaQuery from "@mui/material/useMediaQuery";
import Header from "../../components/Header";

const FormUser = () => {
  const isNonMobile = useMediaQuery("(min-width:600px)");

  const handleFormSubmit = (values) => {
    console.log(values);
  };

  // const phoneRegExp =
  //   /^((\+[1-9]{1,4}[ -]?)|(\([0-9]{2,3}\)[ -]?)|([0-9]{2,4})[ -]?)*?[0-9]{3,4}[ -]?[0-9]{3,4}$/;

  // Esquema de validação atualizado
  const checkoutSchema = yup.object().shape({
    firstName: yup.string().required("obrigatório"),
    lastName: yup.string().required("obrigatório"),
   // email: yup.string().email("invalid email").required("obrigatório"),
    username: yup
    .string()
    .matches(/^[a-zA-Z0-9_]+$/, "O nome de usuário deve conter apenas letras, números e underscores")
    .required("Nome de usuário é obrigatório"),
  password: yup.string().required("A senha é obrigatória"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "As senhas devem coincidir")
    .required("Confirmar senha é obrigatório"),
  });

  const initialValues = {
    firstName: "",
    lastName: "",
   // email: "",
    username: "",
    password: "",
    confirmPassword: "",
  };

  return (
    <Box m="20px">
      <Header title="Novo usuário:" subtitle="Crie um novo perfil de usuário" />

      <Formik
        onSubmit={handleFormSubmit}
        initialValues={initialValues}
        validationSchema={checkoutSchema}
      >
        {({
          values,
          errors,
          touched,
          handleBlur,
          handleChange,
          handleSubmit,
        }) => (
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
                value={values.firstName}
                name="firstName"
                error={!!touched.firstName && !!errors.firstName}
                helperText={touched.firstName && errors.firstName}
                sx={{ gridColumn: "span 2" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Apelido"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.lastName}
                name="lastName"
                error={!!touched.lastName && !!errors.lastName}
                helperText={touched.lastName && errors.lastName}
                sx={{ gridColumn: "span 2" }}
              />
              {/* <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Email"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.email}
                name="email"
                error={!!touched.email && !!errors.email}
                helperText={touched.email && errors.email}
                sx={{ gridColumn: "span 4" }}
              /> */}
              <TextField
                fullWidth
                variant="filled"
                type="number"
                label="Excluir Dados com Senha"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.username}
                name="username"
                error={!!touched.username && !!errors.username}
                helperText={touched.username && errors.username}
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
    <Button type="submit" color="primary" variant="contained">
      Gerar Senha
    </Button>
    <Button type="submit" color="primary" variant="contained">
      Gerar Senha de Exclusão
    </Button>
    <Button type="submit" color="primary" variant="contained">
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
