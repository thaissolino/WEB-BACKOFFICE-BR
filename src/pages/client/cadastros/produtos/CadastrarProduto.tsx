import { FocusEvent, FormEvent, ReactNode, useEffect, useId, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  AlignJustify,
  Camera,
  Check,
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
import { CLIENT_PRODUCT_OPEN_KEY } from "./productFilters";
import { formatMoneyBr, formatMoneyRs, parseMoneyBr, type PdvProduct } from "./types";
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
  nomeLoja: "",
  ncm: "",
  marca: "Sem Marca",
  colecao: "SEM COLEÇÃO",
  genero: "SEM GÊNERO",
  unidade: "UN - UNIDADE",
  custoMedio: "0,00",
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

function productBody(current: typeof EMPTY_FORM, categories: FlatOption[], fallbackCategory = "") {
  const categoryId = current.categorias[0] || "";
  const category =
    categories.find((item) => item.id === categoryId)?.label ?? (fallbackCategory || categoryId);
  return {
    name: current.nome.trim(),
    lojaName:
      current.nomeLoja.trim() === current.nome.trim() ? "" : current.nomeLoja.trim(),
    description: current.descricao.trim(),
    weightAverage: parseMoneyBr(current.peso),
    lojaCostAverage: parseMoneyBr(current.custoMedio),
    barcode: current.codBarra.trim(),
    ncm: current.ncm.trim(),
    brand: current.marca,
    collection: current.colecao,
    gender: current.genero,
    unit: current.unidade,
    reference: current.referencia.trim(),
    model: current.modelo.trim(),
    categoryId,
    category,
    lojaSalePrice: parseMoneyBr(current.precoVenda),
    lojaCostPrice: parseMoneyBr(current.precoCusto),
    lojaStock: parseMoneyBr(current.estoque),
    supplierCode: current.codProdForn.trim(),
    supplierName: current.fornecedor,
    origin: current.origem,
    composition: current.composicao.trim(),
    warranty: current.garantia.trim(),
    validity: current.validade.trim(),
    height: parseMoneyBr(current.altura),
    width: parseMoneyBr(current.largura),
    depth: parseMoneyBr(current.profundidade),
  };
}

function formFromProduct(product: PdvProduct) {
  return {
    ...EMPTY_FORM,
    categorias: product.categoryId ? [product.categoryId] : [],
    nome: product.name || "",
    nomeLoja: (product.lojaName || "").trim() || product.name || "",
    ncm: product.ncm || "",
    marca: product.brand || EMPTY_FORM.marca,
    colecao: product.collection || EMPTY_FORM.colecao,
    genero: product.gender || EMPTY_FORM.genero,
    unidade: product.unit || EMPTY_FORM.unidade,
    referencia: product.reference || "",
    estoque: formatMoneyBr(product.lojaStock || 0),
    precoVenda: formatMoneyBr(product.lojaSalePrice || 0),
    precoCusto: formatMoneyBr(product.lojaCostPrice || 0),
    custoMedio: formatMoneyBr(product.lojaCostAverage || 0),
    descricao: product.description || "",
    fornecedor: product.supplierName || "",
    codBarra: product.barcode || "",
    codProdForn: product.supplierCode || "",
    modelo: product.model || "",
    origem: product.origin || EMPTY_FORM.origem,
    composicao: product.composition || "",
    garantia: product.warranty || "",
    validade: product.validity || EMPTY_FORM.validade,
    peso: formatMoneyBr(product.weightAverage || 0),
    altura: formatMoneyBr(product.height || 0),
    largura: formatMoneyBr(product.width || 0),
    profundidade: formatMoneyBr(product.depth || 0),
  };
}

function openedProduct(id: string): PdvProduct | null {
  if (!id) return null;
  try {
    const raw = sessionStorage.getItem(CLIENT_PRODUCT_OPEN_KEY);
    if (!raw) return null;
    const product = JSON.parse(raw) as PdvProduct;
    return product.id === id ? product : null;
  } catch {
    return null;
  }
}

function categorySeed(product: PdvProduct | null): FlatOption[] {
  if (!product?.categoryId) return [];
  return [{ id: product.categoryId, label: product.category || product.categoryId, depth: 0 }];
}

export default function CadastrarProduto() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editingId = params.get("id") || "";
  const opened = useState(() => openedProduct(editingId))[0];
  const [tab, setTab] = useState<CadTab>("gerais");
  const [form, setForm] = useState(() => (opened ? formFromProduct(opened) : EMPTY_FORM));
  const formRef = useRef(form);
  const categoriesRef = useRef<FlatOption[]>([]);
  const savedKey = useRef("");
  const loadedForm = useRef<typeof EMPTY_FORM | null>(null);
  const categoryNameRef = useRef(opened?.category || "");
  const saving = useRef(false);
  const pendingSave = useRef(false);
  const photoRef = useRef<File | null>(null);
  const sentPhoto = useRef<File | null>(null);
  const [, setBrands] = useState<string[]>([]);
  const [, setCollections] = useState<string[]>([]);
  const [, setGenders] = useState(PRODUCT_GENDERS);
  const [, setUnits] = useState(PRODUCT_UNITS);
  const [categories, setCategories] = useState<FlatOption[]>(() => categorySeed(opened));
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [quick, setQuick] = useState<QuickKind>(null);
  const [status, setStatus] = useState("");
  const [aviso, setAviso] = useState("");
  const avisoTimer = useRef<number | undefined>(undefined);
  const codeRef = useRef(opened?.code || "");
  const [photo1, setPhoto1] = useState<File | null>(null);
  const [photo2, setPhoto2] = useState<File | null>(null);
  const [balanca, setBalanca] = useState({
    disponivel: false,
    codInterno: true,
    codProduto: "",
  });

  const catId = useId();
  // const marcaId = useId();
  // const colId = useId();
  // const genId = useId();
  // const unId = useId();
  const fornId = useId();
  const origemId = useId();
  categoriesRef.current = categories;
  formRef.current = form;

  useEffect(() => {
    if (!editingId) navigate("/client/produtos", { replace: true });
  }, [editingId, navigate]);

  useEffect(() => () => window.clearTimeout(avisoTimer.current), []);

  function mostrarAviso(message: string, sumir: boolean) {
    window.clearTimeout(avisoTimer.current);
    setAviso(message);
    if (!sumir) return;
    avisoTimer.current = window.setTimeout(() => setAviso(""), 3000);
  }

  useEffect(() => {
    if (!editingId) return;
    api
      .get(`/clients/products/${editingId}`)
      .then(({ data }) => {
        const product = data.product as PdvProduct | undefined;
        if (!product) return;
        const next = formFromProduct(product);
        formRef.current = next;
        loadedForm.current = next;
        categoryNameRef.current = product.category || "";
        codeRef.current = product.code || codeRef.current;
        savedKey.current = JSON.stringify(productBody(next, categoriesRef.current, categoryNameRef.current));
        setCategories((current) => {
          const seed = categorySeed(product);
          if (!seed.length || current.some((item) => item.id === seed[0].id)) return current;
          return [...seed, ...current];
        });
        setForm(next);
      })
      .catch((err) => {
        const parsed = parseError(err);
        setStatus(parsed.friend || parsed.message || "Não foi possível abrir o produto.");
      });
  }, [editingId]);

  useEffect(() => {
    const loaded = loadedForm.current;
    if (!loaded) return;
    if (JSON.stringify(formRef.current) !== JSON.stringify(loaded)) return;
    savedKey.current = JSON.stringify(productBody(loaded, categories, categoryNameRef.current));
  }, [categories]);

  useEffect(() => {
    listCatalog("brand", true)
      .then((rows) => setBrands(rows.map((item) => item.name)))
      .catch(() => setBrands([]));
    listCatalog("collection", true)
      .then((rows) => setCollections(rows.map((item) => item.name)))
      .catch(() => setCollections([]));
    loadProductCategories(true)
      .then((rows) =>
        setCategories((current) => {
          const next = toFlatOptions(rows);
          const selected = formRef.current.categorias[0];
          if (!selected || next.some((item) => item.id === selected)) return next;
          const known = current.find((item) => item.id === selected);
          return known ? [known, ...next] : next;
        }),
      )
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
    const next = { ...formRef.current, [key]: value };
    formRef.current = next;
    setForm(next);
  }

  async function saveIfDirty() {
    if (!editingId || !savedKey.current) return;
    const current = formRef.current;
    if (current.categorias.length === 0) {
      setStatus("Selecione uma categoria.");
      return;
    }
    if (!current.nome.trim()) {
      setStatus("O nome do produto vem do backoffice.");
      return;
    }
    const body = productBody(current, categoriesRef.current, categoryNameRef.current);
    const key = JSON.stringify(body);
    const photo = photoRef.current;
    const photoPending = Boolean(photo && photo !== sentPhoto.current);
    if (key === savedKey.current && !photoPending) return;
    if (saving.current) {
      pendingSave.current = true;
      return;
    }
    saving.current = true;
    const code = codeRef.current;
    mostrarAviso(code ? `Salvando o produto ${code}...` : "Salvando...", false);
    try {
      if (key !== savedKey.current) {
        await api.put(`/clients/products/${editingId}`, body);
        savedKey.current = key;
      }
      if (photo && photo !== sentPhoto.current) {
        const fileBody = new FormData();
        fileBody.append("file", photo);
        await api.post(`/clients/products/${editingId}/photo`, fileBody);
        sentPhoto.current = photo;
      }
      setStatus("");
      mostrarAviso(code ? `Produto ${code} atualizado com sucesso!` : "Produto atualizado com sucesso!", true);
    } catch (err) {
      const parsed = parseError(err);
      window.clearTimeout(avisoTimer.current);
      setAviso("");
      setStatus(parsed.friend || parsed.message || "Não foi possível salvar o produto.");
    } finally {
      saving.current = false;
      if (pendingSave.current) {
        pendingSave.current = false;
        void saveIfDirty();
      }
    }
  }

  function choose<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    patch(key, value);
    void saveIfDirty();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void saveIfDirty();
  }

  function onFormFocus(event: FocusEvent<HTMLFormElement>) {
    const node = event.target;
    if (!(node instanceof HTMLElement)) return;
    if (node instanceof HTMLInputElement && ["radio", "checkbox", "file"].includes(node.type)) return;
    node.classList.add("pdv-prod-editing");
  }

  function onFormBlur(event: FocusEvent<HTMLFormElement>) {
    const node = event.target;
    if (node instanceof HTMLElement) node.classList.remove("pdv-prod-editing");
    const next = event.relatedTarget;
    if (next instanceof Node && event.target instanceof Node && event.target.contains(next)) return;
    void saveIfDirty();
  }

  if (!editingId) return null;

  return (
    <CadastroShell>
      <section className="pdv-cad-page pdv-prod-page pdv-cat-page pdv-prod-config" aria-labelledby="pdv-prod-cad-title">
        <div className="pdv-cad-sheet pdv-prod-sheet">
          <div className="pdv-prod-cad-head pdv-prod-config-head">
            <h1 id="pdv-prod-cad-title" className="pdv-prod-official-name">
              {form.nome}
            </h1>
            <button
              className="pdv-cad-btn pdv-cad-btn-back pdv-voltar"
              type="button"
              onClick={() => {
                void saveIfDirty();
                navigate("/client/produtos", { state: { returnedProductId: editingId } });
              }}
            >
              Voltar
            </button>
          </div>

          <div className="pdv-prod-box">
          {aviso ? (
            <p className="pdv-prod-save-flash" role="status">
              <Check size={16} aria-hidden="true" />
              {aviso}
            </p>
          ) : null}
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
            id="pdv-prod-cad-form"
            className="pdv-prod-cad-form"
            onSubmit={onSubmit}
            onFocus={onFormFocus}
            onBlur={onFormBlur}
            onChange={(event) => {
              const target = event.target;
              if (target instanceof HTMLSelectElement) {
                void saveIfDirty();
                return;
              }
              if (
                target instanceof HTMLInputElement &&
                (target.type === "radio" || target.type === "checkbox")
              ) {
                void saveIfDirty();
              }
            }}
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
                    onChange={(categorias) => choose("categorias", categorias)}
                    required
                    labelledBy={catId}
                    placeholder="Selecione"
                    options={categories}
                  />
                </PlusField>

                <div className="pdv-prod-row">
                  <label htmlFor="pdv-prod-nome-loja">Nome na loja</label>
                  <input
                    id="pdv-prod-nome-loja"
                    value={form.nomeLoja}
                    maxLength={200}
                    onChange={(event) => patch("nomeLoja", event.target.value)}
                    autoComplete="off"
                  />
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

                {/*
                <PlusField labelId={marcaId} label="Marca" addLabel="Cadastrar Marca" onAdd={() => setQuick("marca")}>
                  <SearchableSelect
                    value={form.marca}
                    onChange={(marca) => choose("marca", marca || "Sem Marca")}
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
                    onChange={(colecao) => choose("colecao", colecao || "SEM COLEÇÃO")}
                    options={collections}
                    labelledBy={colId}
                  />
                </PlusField>

                <PlusField labelId={genId} label="Gênero" addLabel="Cadastrar Gênero" onAdd={() => setQuick("genero")}>
                  <SearchableSelect
                    value={form.genero}
                    onChange={(genero) => choose("genero", genero || "SEM GÊNERO")}
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
                    onChange={(unidade) => choose("unidade", unidade || "UN - UNIDADE")}
                    options={units}
                    labelledBy={unId}
                  />
                </PlusField>
                */}

                <div className="pdv-prod-costs">
                  <p>
                    <span>Último custo</span>
                    <strong>{formatMoneyRs(parseMoneyBr(form.precoCusto))}</strong>
                  </p>
                  <span className="pdv-prod-costs-pipe" aria-hidden="true" />
                  <p>
                    <span>Custo médio</span>
                    <strong>{formatMoneyRs(parseMoneyBr(form.custoMedio))}</strong>
                  </p>
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
                    onChange={(precoUniversal) => choose("precoUniversal", precoUniversal)}
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
                    onChange={(valePresente) => choose("valePresente", valePresente)}
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
                    options={["Sim", "Não"]}
                    onChange={(gerarRef) => choose("gerarRef", gerarRef)}
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
                    onChange={(aplicarBarra) => choose("aplicarBarra", aplicarBarra)}
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
                        onChange={(fornecedor) => choose("fornecedor", fornecedor)}
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
                      <PhotoSlot
                        id="pdv-prod-img1"
                        file={photo1}
                        onChange={(file) => {
                          photoRef.current = file;
                          setPhoto1(file);
                          void saveIfDirty();
                        }}
                      />
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
                        onChange={(origem) => choose("origem", origem || "BRASIL")}
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
            </form>
          </div>
        </div>
      </section>

      <CadastrarMarcaModal
        open={quick === "marca"}
        onClose={() => setQuick(null)}
        onCreated={(name) => {
          void createCatalog("brand", { name }).catch(() => undefined);
          setBrands((current) => (current.includes(name) ? current : [...current, name]));
          patch("marca", name);
          void saveIfDirty();
        }}
      />
      <CadastrarColecaoModal
        open={quick === "colecao"}
        onClose={() => setQuick(null)}
        onCreated={(name) => {
          void createCatalog("collection", { name }).catch(() => undefined);
          setCollections((current) => (current.includes(name) ? current : [...current, name]));
          patch("colecao", name);
          void saveIfDirty();
        }}
      />
      <CadastrarGeneroModal
        open={quick === "genero"}
        onClose={() => setQuick(null)}
        onCreated={(name) => {
          setGenders((current) => (current.includes(name) ? current : [...current, name]));
          patch("genero", name);
          void saveIfDirty();
        }}
      />
      <CadastrarUnidadeModal
        open={quick === "unidade"}
        onClose={() => setQuick(null)}
        onCreated={(name) => {
          setUnits((current) => (current.includes(name) ? current : [...current, name]));
          patch("unidade", name);
          void saveIfDirty();
        }}
      />
    </CadastroShell>
  );
}
