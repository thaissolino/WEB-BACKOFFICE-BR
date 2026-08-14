import { FormEvent, ReactNode, useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  AlignJustify,
  Camera,
  ChevronDown,
  Info,
  LayoutGrid,
  Plus,
  Ruler,
  Scale,
  Settings,
} from "lucide-react";
import { api, parseError } from "../../../../services/api";
import CadastroShell from "../CadastroShell";
import { usePdvSession } from "../../dashboard/PdvShell";
import PdvTip from "../../dashboard/PdvTip";
import CategorySelect from "./CategorySelect";
import SearchableSelect from "./SearchableSelect";
import {
  AtivoToggle,
  CadastrarColecaoModal,
  CadastrarGeneroModal,
  CadastrarMarcaModal,
  CadastrarUnidadeModal,
} from "./QuickCadWindows";
import { createCatalog, listCatalog } from "../catalog/catalogApi";
import { loadProductCategories, toFlatOptions, type FlatOption } from "./categoryModel";
import { PRODUCT_GENDERS, PRODUCT_ORIGINS, PRODUCT_UNITS } from "./productOptions";
import { parseMoneyBr } from "./types";
import type { PdvSupplier } from "../fornecedores/types";

type CadTab = "gerais" | "grade";
type QuickKind = "marca" | "colecao" | "genero" | "unidade" | null;

function Hint({ text }: { text: string }) {
  return (
    <PdvTip label={text}>
      <span className="pdv-prod-i" aria-hidden="true">
        <Info size={13} strokeWidth={2.4} />
      </span>
    </PdvTip>
  );
}

function Radios({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <div className="pdv-prod-radios">
      {options.map((option) => (
        <label key={option}>
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          {option}
        </label>
      ))}
    </div>
  );
}

function PlusField({
  labelId,
  label,
  children,
  onAdd,
  addLabel,
  extra,
}: {
  labelId: string;
  label: ReactNode;
  children: ReactNode;
  onAdd: () => void;
  addLabel: string;
  extra?: ReactNode;
}) {
  return (
    <div className="pdv-prod-row">
      <span id={labelId}>{label}</span>
      <div className="pdv-prod-plus-field">
        <div className="pdv-prod-plus-ctrl">
          {children}
          <button className="pdv-prod-plus" type="button" aria-label={addLabel} onClick={onAdd}>
            <Plus size={16} strokeWidth={2.8} aria-hidden="true" />
          </button>
        </div>
        {extra}
      </div>
    </div>
  );
}

function Block({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pdv-prod-block">
      <h2>
        {icon}
        {title}
      </h2>
      <div className="pdv-prod-block-body">{children}</div>
    </section>
  );
}

function Collapsed({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="pdv-prod-block">
      <button
        className="pdv-prod-collapse"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {icon}
        {title}
        <ChevronDown size={16} aria-hidden="true" data-open={open ? "true" : undefined} />
      </button>
      {open ? <div className="pdv-prod-block-body">{children}</div> : null}
    </section>
  );
}

function PhotoSlot({
  id,
  file,
  onChange,
}: {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const preview = file ? URL.createObjectURL(file) : "";
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div className="pdv-prod-photo-slot">
      {preview ? (
        <img src={preview} alt="" className="pdv-prod-photo-preview-img" />
      ) : (
        <span className="pdv-prod-photo-ph" aria-hidden="true">
          <Camera size={42} strokeWidth={1.4} />
        </span>
      )}
      <label className="pdv-prod-file">
        <input
          id={id}
          type="file"
          accept="image/*"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
        <span className="pdv-prod-file-name">{file ? file.name : "Nenhum arquivo selecionado"}</span>
        <span className="pdv-prod-file-action">Escolher arquivo</span>
      </label>
    </div>
  );
}

const EMPTY_FORM = {
  categorias: [] as string[],
  nome: "",
  ncm: "",
  marca: "Sem Marca",
  colecao: "SEM COLEÇÃO",
  genero: "SEM GÊNERO",
  unidade: "UN - UNIDADE",
  tipoCusto: "Custo Real",
  precoUniversal: "Não",
  valePresente: "Não",
  gerarRef: "Não",
  aplicarBarra: "Não",
  referencia: "",
  lucro: "0,00",
  estoque: "0",
  precoVenda: "0,00",
  precoCusto: "0,00",
  descricao: "",
  fornecedor: "",
  codBarra: "",
  codProdForn: "",
  modelo: "",
  origem: "BRASIL",
  composicao: "",
  garantia: "",
  validade: "INDETERMINADA",
  peso: "0,000",
  altura: "0,00",
  largura: "0,00",
  profundidade: "0,00",
};

export default function CadastrarProduto() {
  const navigate = useNavigate();
  const { storeId, stores } = usePdvSession();
  const [tab, setTab] = useState<CadTab>("gerais");
  const [stockId, setStockId] = useState(storeId);
  const [form, setForm] = useState(EMPTY_FORM);
  const [brands, setBrands] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [genders, setGenders] = useState(PRODUCT_GENDERS);
  const [units, setUnits] = useState(PRODUCT_UNITS);
  const [categories, setCategories] = useState<FlatOption[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [quick, setQuick] = useState<QuickKind>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo1, setPhoto1] = useState<File | null>(null);
  const [photo2, setPhoto2] = useState<File | null>(null);
  const [balanca, setBalanca] = useState({
    disponivel: false,
    codInterno: true,
    codProduto: "",
  });

  const catId = useId();
  const marcaId = useId();
  const colId = useId();
  const genId = useId();
  const unId = useId();
  const fornId = useId();
  const origemId = useId();

  const stock = stores.find((item) => item.id === stockId) ?? stores[0];

  useEffect(() => {
    setStockId(storeId);
  }, [storeId]);

  useEffect(() => {
    listCatalog("brand", true)
      .then((rows) => setBrands(rows.map((item) => item.name)))
      .catch(() => setBrands([]));
    listCatalog("collection", true)
      .then((rows) => setCollections(rows.map((item) => item.name)))
      .catch(() => setCollections([]));
    loadProductCategories(true)
      .then((rows) => setCategories(toFlatOptions(rows)))
      .catch(() => setCategories([]));
    api
      .get("/clients/suppliers", { params: { ativo: "1" } })
      .then(({ data }) => {
        const list = (data.suppliers as PdvSupplier[]) ?? [];
        setSuppliers(list.map((item) => item.fantasia || item.razao).filter(Boolean));
      })
      .catch(() => setSuppliers([]));
  }, []);

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent, mode: "ok" | "atualizar" | "novo" | "etiqueta") {
    event.preventDefault();
    if (form.categorias.length === 0) {
      setStatus("Selecione uma categoria.");
      return;
    }
    if (!form.nome.trim()) {
      setStatus("Informe o nome do produto.");
      return;
    }

    const categoryId = form.categorias[0];
    const category =
      categories.find((item) => item.id === categoryId)?.label ?? categoryId;

    setBusy(true);
    setStatus("");
    try {
      const { data } = await api.post("/clients/products", {
        name: form.nome.trim(),
        description: form.descricao.trim() || form.nome.trim(),
        weightAverage: parseMoneyBr(form.peso),
        priceweightAverage: parseMoneyBr(form.precoCusto) || parseMoneyBr(form.precoVenda),
        barcode: form.codBarra.trim(),
        ncm: form.ncm.trim(),
        brand: form.marca,
        collection: form.colecao,
        gender: form.genero,
        unit: form.unidade,
        reference: form.referencia.trim(),
        model: form.modelo.trim(),
        categoryId,
        category,
        salePrice: parseMoneyBr(form.precoVenda),
        costPrice: parseMoneyBr(form.precoCusto),
        stockQuantity: parseMoneyBr(form.estoque),
        supplierCode: form.codProdForn.trim(),
        supplierName: form.fornecedor,
        origin: form.origem,
        composition: form.composicao.trim(),
        warranty: form.garantia.trim(),
        validity: form.validade.trim(),
        height: parseMoneyBr(form.altura),
        width: parseMoneyBr(form.largura),
        depth: parseMoneyBr(form.profundidade),
      });
      const productId = data?.product?.id as string | undefined;
      if (productId && photo1) {
        const body = new FormData();
        body.append("file", photo1);
        await api.post(`/clients/products/${productId}/photo`, body);
      }
      setStatus(
        mode === "novo"
          ? "Produto cadastrado. Formulário liberado para novo cadastro."
          : mode === "etiqueta"
            ? "Produto cadastrado. Impressão de etiqueta não foi disparada."
            : "Produto cadastrado.",
      );
      if (mode === "novo") {
        setForm(EMPTY_FORM);
        setPhoto1(null);
        setPhoto2(null);
        setBalanca({ disponivel: false, codInterno: true, codProduto: "" });
      }
    } catch (err) {
      const parsed = parseError(err);
      setStatus(parsed.friend || parsed.message || "Não foi possível cadastrar o produto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page pdv-prod-page" aria-labelledby="pdv-prod-cad-title">
        <div className="pdv-cad-sheet pdv-prod-sheet">
          <div className="pdv-prod-cad-head">
            <h1 id="pdv-prod-cad-title">CADASTRO DE PRODUTO</h1>
            <label className="pdv-prod-stock">
              <span className="pdv-sr">Estoque</span>
              <select value={stock?.id ?? ""} onChange={(event) => setStockId(event.target.value)}>
                {stores.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="pdv-prod-tabs" role="tablist" aria-label="Cadastro de produto">
            <button
              className="pdv-prod-tab"
              type="button"
              role="tab"
              aria-selected={tab === "gerais"}
              onClick={() => setTab("gerais")}
            >
              <AlignJustify size={14} aria-hidden="true" />
              Dados Gerais
              <AlertTriangle className="pdv-prod-warn" size={14} aria-label="Aviso" />
            </button>
            <button
              className="pdv-prod-tab"
              type="button"
              role="tab"
              aria-selected={tab === "grade"}
              onClick={() => setTab("grade")}
            >
              <LayoutGrid size={14} aria-hidden="true" />
              Grade
            </button>
          </div>

          <form
            className="pdv-prod-cad-form"
            onSubmit={(event) => onSubmit(event, "ok")}
          >
          {tab === "grade" ? (
            <div className="pdv-prod-grade-tab">
              <section className="pdv-prod-grade-panel" aria-labelledby="pdv-cad-tam-title">
                <h2 id="pdv-cad-tam-title">Tamanho</h2>
                <p>{form.categorias.length ? "Sem Tamanho" : "Nenhum"}</p>
              </section>
              <section className="pdv-prod-grade-panel" aria-labelledby="pdv-cad-cor-title">
                <h2 id="pdv-cad-cor-title">Cor</h2>
                <p>{form.categorias.length ? "Sem Cor" : "Nenhum"}</p>
              </section>
            </div>
          ) : (
            <div className="pdv-prod-gerais">
              <section className="pdv-prod-grade-box" aria-labelledby="pdv-prod-grade-title">
                <h2 id="pdv-prod-grade-title">Dados Gerais da Grade</h2>

                <PlusField
                  labelId={catId}
                  label="Categoria"
                  addLabel="Cadastrar categoria"
                  extra={<p className="pdv-prod-grade-none">Grade: Nenhum</p>}
                  onAdd={() => navigate("/client/produtos/categorias/cadastrar")}
                >
                  <CategorySelect
                    selected={form.categorias}
                    onChange={(categorias) => patch("categorias", categorias)}
                    required
                    labelledBy={catId}
                    placeholder="Selecione"
                    options={categories}
                  />
                </PlusField>

                <div className="pdv-prod-row">
                  <label htmlFor="pdv-prod-nome">Nome</label>
                  <div>
                    <input
                      id="pdv-prod-nome"
                      value={form.nome}
                      maxLength={200}
                      onChange={(event) => patch("nome", event.target.value)}
                      autoComplete="off"
                    />
                    <p className="pdv-prod-count">{form.nome.length} / 200 Caracteres.</p>
                  </div>
                </div>

                <div className="pdv-prod-row">
                  <label htmlFor="pdv-prod-ncm">NCM</label>
                  <input
                    id="pdv-prod-ncm"
                    value={form.ncm}
                    onChange={(event) => patch("ncm", event.target.value)}
                    autoComplete="off"
                  />
                </div>

                <PlusField labelId={marcaId} label="Marca" addLabel="Cadastrar Marca" onAdd={() => setQuick("marca")}>
                  <SearchableSelect
                    value={form.marca}
                    onChange={(marca) => patch("marca", marca || "Sem Marca")}
                    options={brands}
                    labelledBy={marcaId}
                  />
                </PlusField>

                <PlusField
                  labelId={colId}
                  label="Coleção"
                  addLabel="Cadastrar Coleção"
                  onAdd={() => setQuick("colecao")}
                >
                  <SearchableSelect
                    value={form.colecao}
                    onChange={(colecao) => patch("colecao", colecao || "SEM COLEÇÃO")}
                    options={collections}
                    labelledBy={colId}
                  />
                </PlusField>

                <PlusField labelId={genId} label="Gênero" addLabel="Cadastrar Gênero" onAdd={() => setQuick("genero")}>
                  <SearchableSelect
                    value={form.genero}
                    onChange={(genero) => patch("genero", genero || "SEM GÊNERO")}
                    options={genders}
                    labelledBy={genId}
                  />
                </PlusField>

                <PlusField
                  labelId={unId}
                  label="Unidade de Medida"
                  addLabel="Cadastrar Unidade de Medida"
                  onAdd={() => setQuick("unidade")}
                >
                  <SearchableSelect
                    value={form.unidade}
                    onChange={(unidade) => patch("unidade", unidade || "UN - UNIDADE")}
                    options={units}
                    labelledBy={unId}
                  />
                </PlusField>

                <div className="pdv-prod-row">
                  <span>Tipo de custo</span>
                  <Radios
                    name="tipo-custo"
                    value={form.tipoCusto}
                    options={["Custo Real", "Último Custo", "Custo Médio"]}
                    onChange={(tipoCusto) => patch("tipoCusto", tipoCusto)}
                  />
                </div>

                <div className="pdv-prod-row">
                  <span>
                    Preço de venda Universal para esta grade
                    <Hint text="Preço de venda Universal para esta grade" />
                  </span>
                  <Radios
                    name="preco-uni"
                    value={form.precoUniversal}
                    options={["Sim", "Não"]}
                    onChange={(precoUniversal) => patch("precoUniversal", precoUniversal)}
                  />
                </div>

                <div className="pdv-prod-row">
                  <span>
                    Vale Presente
                    <Hint text="Vale Presente" />
                  </span>
                  <Radios
                    name="vale"
                    value={form.valePresente}
                    options={["Sim", "Não"]}
                    onChange={(valePresente) => patch("valePresente", valePresente)}
                  />
                </div>

                <div className="pdv-prod-row">
                  <span>
                    Gerar Referências com variações
                    <Hint text="Gerar Referências com variações" />
                  </span>
                  <Radios
                    name="gerar-ref"
                    value={form.gerarRef}
                    options={["Sim", "Não", "Em branco"]}
                    onChange={(gerarRef) => patch("gerarRef", gerarRef)}
                  />
                </div>

                <div className="pdv-prod-row">
                  <span>
                    Aplicar código de barras para todos produtos da grade
                    <Hint text="Aplicar código de barras para todos produtos da grade" />
                  </span>
                  <Radios
                    name="barra-grade"
                    value={form.aplicarBarra}
                    options={["Sim", "Não"]}
                    onChange={(aplicarBarra) => patch("aplicarBarra", aplicarBarra)}
                  />
                </div>
              </section>

              <div className="pdv-prod-cols">
                <div className="pdv-prod-col">
                  <Block title="Atributos" icon={<Settings size={16} aria-hidden="true" />}>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-ref">Referência</label>
                      <input
                        id="pdv-prod-ref"
                        value={form.referencia}
                        onChange={(event) => patch("referencia", event.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <span>
                        Lucro
                        <Settings size={13} aria-hidden="true" />
                        <Hint text="Lucro" />
                      </span>
                      <div className="pdv-prod-suffix">
                        <input
                          value={form.lucro}
                          onChange={(event) => patch("lucro", event.target.value)}
                          inputMode="decimal"
                          autoComplete="off"
                          aria-label="Lucro"
                        />
                        <span>%</span>
                      </div>
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-est">Estoque</label>
                      <input
                        id="pdv-prod-est"
                        value={form.estoque}
                        onChange={(event) => patch("estoque", event.target.value)}
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-pv">Preço Venda</label>
                      <input
                        id="pdv-prod-pv"
                        value={form.precoVenda}
                        onChange={(event) => patch("precoVenda", event.target.value)}
                        inputMode="decimal"
                        autoComplete="off"
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-pc">Preço Custo</label>
                      <input
                        id="pdv-prod-pc"
                        value={form.precoCusto}
                        onChange={(event) => patch("precoCusto", event.target.value)}
                        inputMode="decimal"
                        autoComplete="off"
                      />
                    </div>
                    <div className="pdv-prod-row pdv-prod-row-top">
                      <label htmlFor="pdv-prod-desc">Descrição</label>
                      <textarea
                        id="pdv-prod-desc"
                        value={form.descricao}
                        onChange={(event) => patch("descricao", event.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <span id={fornId}>Fornecedor</span>
                      <SearchableSelect
                        value={form.fornecedor}
                        onChange={(fornecedor) => patch("fornecedor", fornecedor)}
                        options={suppliers}
                        emptyLabel="Nenhum selecionado"
                        labelledBy={fornId}
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-barra">Cód. de barra</label>
                      <input
                        id="pdv-prod-barra"
                        value={form.codBarra}
                        onChange={(event) => patch("codBarra", event.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-cpf">Cód. Prod. Fornecedor</label>
                      <input
                        id="pdv-prod-cpf"
                        value={form.codProdForn}
                        onChange={(event) => patch("codProdForn", event.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-mod">Modelo</label>
                      <input
                        id="pdv-prod-mod"
                        value={form.modelo}
                        onChange={(event) => patch("modelo", event.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </Block>
                  <Collapsed title="Foto Principal" icon={<Camera size={16} aria-hidden="true" />}>
                    <div className="pdv-prod-photo-slots">
                      <PhotoSlot id="pdv-prod-img1" file={photo1} onChange={setPhoto1} />
                      <PhotoSlot id="pdv-prod-img2" file={photo2} onChange={setPhoto2} />
                    </div>
                  </Collapsed>
                </div>

                <div className="pdv-prod-col">
                  <Block title="Informativo" icon={<Info size={16} aria-hidden="true" />}>
                    <div className="pdv-prod-row">
                      <span id={origemId}>Origem</span>
                      <SearchableSelect
                        value={form.origem}
                        onChange={(origem) => patch("origem", origem || "BRASIL")}
                        options={PRODUCT_ORIGINS}
                        labelledBy={origemId}
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-comp">Composição</label>
                      <input
                        id="pdv-prod-comp"
                        value={form.composicao}
                        onChange={(event) => patch("composicao", event.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-gar">Garantia</label>
                      <input
                        id="pdv-prod-gar"
                        value={form.garantia}
                        onChange={(event) => patch("garantia", event.target.value)}
                        placeholder="ex: 1 Ano"
                        autoComplete="off"
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-val">Validade</label>
                      <input
                        id="pdv-prod-val"
                        value={form.validade}
                        onChange={(event) => patch("validade", event.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </Block>

                  <Block title="Medidas" icon={<Ruler size={16} aria-hidden="true" />}>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-peso">Peso</label>
                      <div className="pdv-prod-suffix">
                        <input
                          id="pdv-prod-peso"
                          value={form.peso}
                          onChange={(event) => patch("peso", event.target.value)}
                          inputMode="decimal"
                          autoComplete="off"
                        />
                        <span>(kg)</span>
                      </div>
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-alt">Altura</label>
                      <div className="pdv-prod-suffix">
                        <input
                          id="pdv-prod-alt"
                          value={form.altura}
                          onChange={(event) => patch("altura", event.target.value)}
                          inputMode="decimal"
                          autoComplete="off"
                        />
                        <span>(m)</span>
                      </div>
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-larg">Largura</label>
                      <div className="pdv-prod-suffix">
                        <input
                          id="pdv-prod-larg"
                          value={form.largura}
                          onChange={(event) => patch("largura", event.target.value)}
                          inputMode="decimal"
                          autoComplete="off"
                        />
                        <span>(m)</span>
                      </div>
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-prof">Profundidade</label>
                      <div className="pdv-prod-suffix">
                        <input
                          id="pdv-prod-prof"
                          value={form.profundidade}
                          onChange={(event) => patch("profundidade", event.target.value)}
                          inputMode="decimal"
                          autoComplete="off"
                        />
                        <span>(m)</span>
                      </div>
                    </div>
                  </Block>

                  <Collapsed title="Balança" icon={<Scale size={16} aria-hidden="true" />}>
                    <div className="pdv-prod-row">
                      <span>
                        Disponível
                        <Hint text="Sim, o produto utiliza balança. Não, o produto não utiliza balança." />
                      </span>
                      <AtivoToggle
                        value={balanca.disponivel}
                        onChange={(disponivel) => setBalanca((current) => ({ ...current, disponivel }))}
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <span>
                        Cód. interno
                        <Hint text="Sim, o cód. produto utilizado será o mesmo do produto. Não, o cód. produto utilizado será escolhido pelo usuário." />
                      </span>
                      <AtivoToggle
                        value={balanca.codInterno}
                        onChange={(codInterno) => setBalanca((current) => ({ ...current, codInterno }))}
                      />
                    </div>
                    <div className="pdv-prod-row">
                      <label htmlFor="pdv-prod-cod-bal">Cód. produto</label>
                      <input
                        id="pdv-prod-cod-bal"
                        value={balanca.codProduto}
                        onChange={(event) =>
                          setBalanca((current) => ({ ...current, codProduto: event.target.value }))
                        }
                        autoComplete="off"
                        disabled={balanca.codInterno}
                      />
                    </div>
                  </Collapsed>
                </div>
              </div>
            </div>
          )}

              {status ? (
                <p className="pdv-prod-status" role="status">
                  {status}
                </p>
              ) : null}

              <div className="pdv-prod-cad-go">
                <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={busy}>
                  <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                  {busy ? "Salvando…" : "Cadastrar"}
                </button>
                <button
                  className="pdv-cad-btn pdv-cad-btn-green"
                  type="button"
                  disabled={busy}
                  onClick={(event) => onSubmit(event, "atualizar")}
                >
                  <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                  Cadastrar e Atualizar
                </button>
                <button
                  className="pdv-cad-btn pdv-cad-btn-green"
                  type="button"
                  disabled={busy}
                  onClick={(event) => onSubmit(event, "novo")}
                >
                  <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                  Cadastrar e realizar Novo Cadastro
                </button>
                <button
                  className="pdv-cad-btn pdv-cad-btn-green"
                  type="button"
                  disabled={busy}
                  onClick={(event) => onSubmit(event, "etiqueta")}
                >
                  <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                  Cadastrar e Imprimir Etiqueta
                </button>
              </div>
            </form>
        </div>
      </section>

      <CadastrarMarcaModal
        open={quick === "marca"}
        onClose={() => setQuick(null)}
        onCreated={(name) => {
          void createCatalog("brand", { name }).catch(() => undefined);
          setBrands((current) => (current.includes(name) ? current : [...current, name]));
          patch("marca", name);
        }}
      />
      <CadastrarColecaoModal
        open={quick === "colecao"}
        onClose={() => setQuick(null)}
        onCreated={(name) => {
          void createCatalog("collection", { name }).catch(() => undefined);
          setCollections((current) => (current.includes(name) ? current : [...current, name]));
          patch("colecao", name);
        }}
      />
      <CadastrarGeneroModal
        open={quick === "genero"}
        onClose={() => setQuick(null)}
        onCreated={(name) => {
          setGenders((current) => (current.includes(name) ? current : [...current, name]));
          patch("genero", name);
        }}
      />
      <CadastrarUnidadeModal
        open={quick === "unidade"}
        onClose={() => setQuick(null)}
        onCreated={(name) => {
          setUnits((current) => (current.includes(name) ? current : [...current, name]));
          patch("unidade", name);
        }}
      />
    </CadastroShell>
  );
}
