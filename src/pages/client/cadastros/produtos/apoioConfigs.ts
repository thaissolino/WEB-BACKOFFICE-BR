export type ApoioFieldKind = "text" | "textarea" | "toggle" | "color";

export type ApoioField = {
  key: string;
  label: string;
  kind?: ApoioFieldKind;
  required?: boolean;
};

export type ApoioRow = {
  id: string;
  code: string;
  active: boolean;
  values: Record<string, string>;
};

export type ApoioConfig = {
  id: string;
  title: string;
  formTitle: string;
  cadastrarLabel: string;
  inativosLabel: string;
  ativosLabel: string;
  alterarLabel?: string;
  listPath: string;
  formPath: string;
  inativosPath: string;
  nameKey: string;
  filters?: { key: string; label: string }[];
  columns: { key: string; label: string }[];
  fields: ApoioField[];
  seed: ApoioRow[];
};

function row(id: string, code: string, values: Record<string, string>, active = true): ApoioRow {
  return { id, code, active, values };
}

export const APOIO_CONFIGS: Record<string, ApoioConfig> = {
  marca: {
    id: "marca",
    title: "MARCAS",
    formTitle: "CADASTRAR MARCA",
    cadastrarLabel: "Cadastrar Marca",
    inativosLabel: "Marcas Inativas",
    ativosLabel: "Marcas Ativas",
    listPath: "/client/produtos/marcas",
    formPath: "/client/produtos/marcas/cadastrar",
    inativosPath: "/client/produtos/marcas/inativas",
    nameKey: "nome",
    filters: [
      { key: "code", label: "Cod. Marca" },
      { key: "nome", label: "Marca" },
    ],
    columns: [
      { key: "code", label: "Código" },
      { key: "nome", label: "Marca" },
      { key: "descricao", label: "Descrição" },
      { key: "atualizar", label: "Atualizar" },
    ],
    fields: [
      { key: "nome", label: "Marca", required: true },
      { key: "descricao", label: "Descrição", kind: "textarea" },
      { key: "ativo", label: "Ativo", kind: "toggle" },
    ],
    seed: [
      row("marca-0", "0", { nome: "Sem Marca", descricao: "S/M" }),
      row("marca-1", "1", { nome: "Aurora Norte", descricao: "" }),
      row("marca-2", "2", { nome: "Brisa Campo", descricao: "" }),
      row("marca-3", "3", { nome: "Cedro Casa", descricao: "" }),
    ],
  },
  tamanho: {
    id: "tamanho",
    title: "TAMANHO",
    formTitle: "CADASTRAR TAMANHO",
    cadastrarLabel: "Cadastrar Tamanho",
    inativosLabel: "Tamanho Inativo",
    ativosLabel: "Tamanho Ativo",
    alterarLabel: "Alterar",
    listPath: "/client/produtos/variacoes/tamanho",
    formPath: "/client/produtos/variacoes/tamanho/cadastrar",
    inativosPath: "/client/produtos/variacoes/tamanho/inativas",
    nameKey: "nome",
    columns: [
      { key: "code", label: "Código" },
      { key: "nome", label: "Nome" },
      { key: "abreviacao", label: "Abreviação" },
      { key: "ordem", label: "Ordem" },
      { key: "atualizar", label: "Atualizar Tamanho" },
    ],
    fields: [
      { key: "nome", label: "Tamanho", required: true },
      { key: "abreviacao", label: "Abreviação" },
      { key: "ativo", label: "Ativo", kind: "toggle" },
    ],
    seed: [
      row("tam-0", "0", { nome: "Sem Tamanho", abreviacao: "S/T", ordem: "-" }),
      row("tam-1", "1", { nome: "PP", abreviacao: "PP", ordem: "" }),
      row("tam-2", "2", { nome: "P", abreviacao: "P", ordem: "" }),
      row("tam-3", "3", { nome: "M", abreviacao: "M", ordem: "" }),
    ],
  },
  cor: {
    id: "cor",
    title: "COR",
    formTitle: "CADASTRAR COR",
    cadastrarLabel: "Cadastrar Cor",
    inativosLabel: "Cor Inativa",
    ativosLabel: "Cor Ativa",
    alterarLabel: "Alterar",
    listPath: "/client/produtos/variacoes/cor",
    formPath: "/client/produtos/variacoes/cor/cadastrar",
    inativosPath: "/client/produtos/variacoes/cor/inativas",
    nameKey: "nome",
    columns: [
      { key: "code", label: "Código" },
      { key: "nome", label: "Nome da Cor" },
      { key: "abreviacao", label: "Abreviação" },
      { key: "hex", label: "Referência da Cor" },
      { key: "ordem", label: "Ordem" },
      { key: "atualizar", label: "Atualizar Cor" },
    ],
    fields: [
      { key: "nome", label: "Nome da Cor", required: true },
      { key: "abreviacao", label: "Abreviação" },
      { key: "hex", label: "Selecione a cor correspondente", kind: "color" },
      { key: "ativo", label: "Ativo", kind: "toggle" },
    ],
    seed: [
      row("cor-0", "0", { nome: "Sem Cor", abreviacao: "S/C", hex: "", ordem: "-" }),
      row("cor-1", "1", { nome: "Preto", abreviacao: "Preto", hex: "#000000", ordem: "" }),
      row("cor-2", "2", { nome: "Branco", abreviacao: "Branco", hex: "#FFFFFF", ordem: "" }),
      row("cor-3", "3", { nome: "Azul", abreviacao: "Azul", hex: "#0000FF", ordem: "" }),
    ],
  },
  colecao: {
    id: "colecao",
    title: "COLEÇÃO",
    formTitle: "CADASTRAR COLEÇÃO",
    cadastrarLabel: "Cadastrar Coleção",
    inativosLabel: "Coleção Inativa",
    ativosLabel: "Coleção Ativa",
    alterarLabel: "Alterar",
    listPath: "/client/produtos/colecoes",
    formPath: "/client/produtos/colecoes/cadastrar",
    inativosPath: "/client/produtos/colecoes/inativas",
    nameKey: "nome",
    columns: [
      { key: "code", label: "Código" },
      { key: "nome", label: "Coleção" },
      { key: "ordem", label: "Ordem" },
      { key: "atualizar", label: "Atualizar" },
    ],
    fields: [
      { key: "nome", label: "Coleção", required: true },
      { key: "ativo", label: "Ativo", kind: "toggle" },
    ],
    seed: [
      row("col-0", "000", { nome: "Sem Coleção", ordem: "-" }),
      row("col-1", "001", { nome: "Linha Aurora", ordem: "" }),
      row("col-2", "002", { nome: "Coleção Inverno Demo", ordem: "" }),
      row("col-3", "003", { nome: "Série Oficina", ordem: "" }),
    ],
  },
  genero: {
    id: "genero",
    title: "GÊNERO",
    formTitle: "CADASTRAR GÊNERO",
    cadastrarLabel: "Cadastrar Gênero",
    inativosLabel: "Gênero Inativo",
    ativosLabel: "Gênero Ativo",
    alterarLabel: "Alterar",
    listPath: "/client/produtos/generos",
    formPath: "/client/produtos/generos/cadastrar",
    inativosPath: "/client/produtos/generos/inativos",
    nameKey: "nome",
    columns: [
      { key: "code", label: "Código" },
      { key: "nome", label: "Gênero" },
      { key: "abreviacao", label: "Abreviação" },
      { key: "ordem", label: "Ordem" },
      { key: "atualizar", label: "Atualizar" },
    ],
    fields: [
      { key: "nome", label: "Gênero", required: true },
      { key: "abreviacao", label: "Abreviação" },
      { key: "ativo", label: "Ativo", kind: "toggle" },
    ],
    seed: [
      row("gen-0", "000", { nome: "Sem Gênero", abreviacao: "S/G", ordem: "-" }),
      row("gen-1", "001", { nome: "Feminino", abreviacao: "F", ordem: "" }),
      row("gen-2", "002", { nome: "Masculino", abreviacao: "M", ordem: "" }),
      row("gen-3", "003", { nome: "Unissex", abreviacao: "U", ordem: "" }),
    ],
  },
  unidade: {
    id: "unidade",
    title: "UNIDADE DE MEDIDA",
    formTitle: "CADASTRAR UNIDADE DE MEDIDA",
    cadastrarLabel: "Cadastrar Unidade de Medida",
    inativosLabel: "",
    ativosLabel: "",
    listPath: "/client/produtos/unidades",
    formPath: "/client/produtos/unidades/cadastrar",
    inativosPath: "/client/produtos/unidades",
    nameKey: "nome",
    columns: [
      { key: "code", label: "Cod" },
      { key: "nome", label: "Unidade" },
      { key: "siglaNfe", label: "Sigla NF-e" },
      { key: "siglaEcf", label: "Sigla ECF" },
      { key: "ordem", label: "Ordem" },
      { key: "ativo", label: "Ativo" },
      { key: "atualizar", label: "Atualizar" },
    ],
    fields: [
      { key: "nome", label: "Unidade", required: true },
      { key: "siglaNfe", label: "Sigla NF-e" },
      { key: "siglaEcf", label: "Sigla ECF" },
    ],
    seed: [
      row("un-1", "1", { nome: "UNIDADE", siglaNfe: "UN", siglaEcf: "UN", ordem: "" }),
      row("un-2", "2", { nome: "QUILOGRAMA", siglaNfe: "KG", siglaEcf: "KG", ordem: "" }),
      row("un-3", "3", { nome: "CAIXA", siglaNfe: "CX", siglaEcf: "CX", ordem: "" }),
    ],
  },
};
