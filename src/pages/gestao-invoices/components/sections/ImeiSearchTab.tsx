import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Package, FileText, Building2, Truck, Calendar, DollarSign, ChevronDown } from "lucide-react";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";
import { matchSearchTerms } from "../utils/searchMatch";
import { formatDateToBR } from "../utils/format";
import { normalizeImeiOrSerial } from "../utils/imeiInput";

/** Alinhado ao backend (IMEI_SEARCH_MIN_LENGTH) — LIKE / contains. */
const IMEI_SEARCH_MIN_LENGTH = 8;

interface ImeiData {
  id?: string;
  imei: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    code: string;
    description?: string | null;
  };
  invoice: {
    id: string;
    number: string;
    date: string;
    supplier: {
      id: string;
      name: string;
    };
    carrier: {
      id: string;
      name: string;
    } | null;
    carrier2: {
      id: string;
      name: string;
    } | null;
  };
  invoiceProduct: {
    id: string;
    quantity: number;
    value: number;
    total: number;
    received: boolean;
  };
}

interface ImeiSearchResponse extends ImeiData {
  count?: number;
  results?: ImeiData[];
}

interface ImeiListResponse {
  imeis: ImeiData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ImeiListItem {
  imei: string;
  productName: string;
  invoiceNumber: string;
}

function toListItem(item: ImeiData): ImeiListItem {
  return {
    imei: item.imei,
    productName: item.product?.name ?? "",
    invoiceNumber: item.invoice?.number ?? "",
  };
}

function filterImeisLocally(items: ImeiListItem[], term: string): ImeiListItem[] {
  if (!term.trim()) return items;
  const normalizedSearch = normalizeImeiOrSerial(term);
  return items.filter((item) => {
    const normalizedImei = normalizeImeiOrSerial(item.imei);
    if (normalizedSearch && normalizedImei.includes(normalizedSearch)) {
      return true;
    }
    return matchSearchTerms(term, `${item.productName} ${item.invoiceNumber}`.trim());
  });
}

export function ImeiSearchTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [imeiData, setImeiData] = useState<ImeiData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [allImeis, setAllImeis] = useState<ImeiListItem[]>([]);
  const [filteredImeis, setFilteredImeis] = useState<ImeiListItem[]>([]);
  const [isLoadingImeis, setIsLoadingImeis] = useState(false);
  const [isFilteringRemote, setIsFilteringRemote] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allImeisData, setAllImeisData] = useState<ImeiData[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const remoteFilterSeq = useRef(0);
  const { setOpenNotification } = useNotification();

  useEffect(() => {
    fetchAllImeis();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtro local imediato + busca remota normalizada (com/sem espaços) se a página local não tiver o IMEI
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredImeis(allImeis);
      setIsFilteringRemote(false);
      return;
    }

    const localFiltered = filterImeisLocally(allImeis, searchTerm);
    setFilteredImeis(localFiltered);

    const normalizedSearch = normalizeImeiOrSerial(searchTerm);
    // Busca no servidor quando não achou na página local e o termo parece IMEI (≥ min chars)
    if (localFiltered.length > 0 || normalizedSearch.length < IMEI_SEARCH_MIN_LENGTH) {
      setIsFilteringRemote(false);
      return;
    }

    const seq = ++remoteFilterSeq.current;
    setIsFilteringRemote(true);
    const timer = setTimeout(async () => {
      try {
        const response = await api.get<ImeiListResponse>("/invoice/imeis/list-all", {
          params: {
            page: 1,
            limit: 50,
            imei: normalizedSearch,
          },
        });
        if (seq !== remoteFilterSeq.current) return;

        const remoteList = (response.data.imeis || []).map(toListItem);
        setFilteredImeis(remoteList);

        // Mescla no cache local para próximas digitações
        if (remoteList.length > 0) {
          setAllImeis((prev) => {
            const seen = new Set(prev.map((item) => normalizeImeiOrSerial(item.imei)));
            const merged = [...prev];
            for (const item of remoteList) {
              const key = normalizeImeiOrSerial(item.imei);
              if (!seen.has(key)) {
                seen.add(key);
                merged.push(item);
              }
            }
            return merged;
          });
          setAllImeisData((prev) => {
            const seen = new Set(prev.map((item) => normalizeImeiOrSerial(item.imei)));
            const merged = [...prev];
            for (const item of response.data.imeis || []) {
              const key = normalizeImeiOrSerial(item.imei);
              if (!seen.has(key)) {
                seen.add(key);
                merged.push(item);
              }
            }
            return merged;
          });
        }
      } catch {
        if (seq === remoteFilterSeq.current) {
          // Mantém lista local vazia; o botão Buscar ainda consulta /imei/search
        }
      } finally {
        if (seq === remoteFilterSeq.current) {
          setIsFilteringRemote(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, allImeis]);

  const fetchAllImeis = async (page: number = 1, limit: number = 100) => {
    setIsLoadingImeis(true);
    try {
      const response = await api.get<ImeiListResponse>("/invoice/imeis/list-all", {
        params: {
          page,
          limit,
        },
      });

      const data: ImeiListResponse = response.data;
      const imeisData: ImeiData[] = data.imeis || [];

      if (page === 1) {
        setAllImeisData(imeisData);
      } else {
        setAllImeisData((prev) => [...prev, ...imeisData]);
      }

      const imeisList: ImeiListItem[] = imeisData.map(toListItem);

      if (page === 1) {
        setAllImeis(imeisList);
        setFilteredImeis(imeisList);
      } else {
        setAllImeis((prev) => [...prev, ...imeisList]);
        setFilteredImeis((prev) => [...prev, ...imeisList]);
      }

      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error: any) {
      console.warn("Lista de IMEIs não carregada:", error?.response?.status ?? error?.message);
      if (page === 1) {
        setAllImeis([]);
        setFilteredImeis([]);
        setAllImeisData([]);
      }
    } finally {
      setIsLoadingImeis(false);
    }
  };

  const handleSearch = async (imeiToSearch?: string) => {
    const rawImei = imeiToSearch || searchTerm;
    const normalizedImei = normalizeImeiOrSerial(rawImei);

    if (!normalizedImei && !rawImei.trim()) {
      if (allImeisData.length > 0) {
        setImeiData(null);
        setNotFound(false);
        setShowDropdown(false);
        return;
      }
      setOpenNotification({
        type: "warning",
        title: "Atenção",
        notification: "Nenhum IMEI cadastrado no sistema",
      });
      return;
    }

    if (normalizedImei.length < IMEI_SEARCH_MIN_LENGTH) {
      setOpenNotification({
        type: "warning",
        title: "Atenção",
        notification: `Informe pelo menos ${IMEI_SEARCH_MIN_LENGTH} caracteres do IMEI (espaços são ignorados). Busca parcial é permitida.`,
      });
      return;
    }

    setIsSearching(true);
    setNotFound(false);
    setImeiData(null);
    setShowDropdown(false);

    try {
      // Sempre envia normalizado: "35 003523 653788 4" → "350035236537884"
      // API: exact → LIKE contains; pode devolver 1 objeto ou vários em results[]
      const response = await api.get<ImeiSearchResponse>(`/invoice/imei/search`, {
        params: { imei: normalizedImei },
      });
      const data = response.data;
      const results =
        Array.isArray(data.results) && data.results.length > 0
          ? data.results
          : data.imei
            ? [data]
            : [];

      if (results.length === 0) {
        setNotFound(true);
        setImeiData(null);
        return;
      }

      if (results.length === 1) {
        setImeiData(results[0]);
        setNotFound(false);
        return;
      }

      // Vários matches (LIKE): popula dropdown para o usuário escolher
      const listItems = results.map((item) => ({
        imei: item.imei,
        productName: item.product?.name ?? "",
        invoiceNumber: item.invoice?.number ?? "",
      }));
      setFilteredImeis(listItems);
      setAllImeisData((prev) => {
        const seen = new Set(prev.map((item) => normalizeImeiOrSerial(item.imei)));
        const merged = [...prev];
        for (const item of results) {
          const key = normalizeImeiOrSerial(item.imei);
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(item);
          }
        }
        return merged;
      });
      setImeiData(null);
      setNotFound(false);
      setShowDropdown(true);
      setOpenNotification({
        type: "warning",
        title: "Vários IMEIs encontrados",
        notification: `${results.length} resultados para "${normalizedImei}". Selecione um na lista.`,
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNotFound(true);
        setImeiData(null);
      } else {
        setOpenNotification({
          type: "error",
          title: "Erro",
          notification: "Erro ao buscar IMEI. Tente novamente.",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectImei = (imei: string) => {
    setSearchTerm(imei);
    setShowDropdown(false);
    handleSearch(imei);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-blue-700 mb-4 flex items-center">
          <Search className="mr-2" size={20} />
          Buscar IMEI
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Selecione ou digite o IMEI para encontrar informações sobre o produto, invoice e fornecedor.
        </p>

        <div className="relative" ref={dropdownRef}>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="IMEI completo ou parcial (≥8 chars; espaços ignorados)"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:text-gray-900 disabled:opacity-100"
                disabled={isSearching}
              />
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
              >
                <ChevronDown size={20} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
            >
              {isSearching ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Buscando...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Buscar
                </>
              )}
            </button>
          </div>

          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
              {isLoadingImeis || isFilteringRemote ? (
                <div className="p-4 text-center text-gray-500">
                  <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                  {isFilteringRemote ? "Buscando IMEI..." : "Carregando IMEIs..."}
                </div>
              ) : filteredImeis.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? "Nenhum IMEI encontrado" : "Nenhum IMEI cadastrado"}
                </div>
              ) : (
                <ul>
                  {filteredImeis.map((item, index) => (
                    <li
                      key={`${normalizeImeiOrSerial(item.imei)}-${index}`}
                      onClick={() => handleSelectImei(item.imei)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-mono text-sm font-semibold text-black">{item.imei}</div>
                      <div className="text-xs text-gray-700 mt-1">
                        {item.productName} • Invoice #{item.invoiceNumber}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 text-sm text-gray-500">
          {isLoadingImeis ? (
            "Carregando..."
          ) : pagination.total > 0 ? (
            `${pagination.total} IMEI${pagination.total !== 1 ? "s" : ""} cadastrado${pagination.total !== 1 ? "s" : ""} no sistema${pagination.totalPages > 1 ? ` (página ${pagination.page} de ${pagination.totalPages})` : ""}`
          ) : (
            `${allImeis.length} IMEI${allImeis.length !== 1 ? "s" : ""} carregado${allImeis.length !== 1 ? "s" : ""}`
          )}
        </div>
      </div>

      {notFound && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
          <div className="text-yellow-600 text-lg font-semibold mb-2">IMEI não encontrado</div>
          <p className="text-gray-600">
            O IMEI{" "}
            <strong className="font-mono text-black">{normalizeImeiOrSerial(searchTerm) || searchTerm}</strong>{" "}
            não está cadastrado no sistema.
          </p>
        </div>
      )}

      {imeiData && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="text-sm text-gray-600 mb-1">IMEI Encontrado</div>
            <div className="text-2xl font-bold font-mono text-black">{imeiData.imei}</div>
            <div className="text-xs text-gray-500 mt-1">
              Cadastrado em: {formatDateToBR(imeiData.createdAt)}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
              <Package size={20} />
              Produto
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-gray-600">Nome</div>
                <div className="font-semibold text-gray-900">{imeiData.product.name}</div>
              </div>
              {imeiData.product.code && (
                <div>
                  <div className="text-sm text-gray-600">Código</div>
                  <div className="font-mono text-gray-900">{imeiData.product.code}</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
              <FileText size={20} />
              Invoice
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-gray-600">Número</div>
                <div className="font-bold text-lg text-gray-900">#{imeiData.invoice.number}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  <Calendar size={14} />
                  Data
                </div>
                <div className="font-semibold text-gray-900">{formatDateToBR(imeiData.invoice.date)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
              <Building2 size={20} />
              Fornecedor
            </div>
            <div className="font-semibold text-lg text-gray-900">{imeiData.invoice.supplier.name}</div>
          </div>

          {(imeiData.invoice.carrier || imeiData.invoice.carrier2) && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
                <Truck size={20} />
                Freteiro(s)
              </div>
              <div className="space-y-2">
                {imeiData.invoice.carrier && (
                  <div>
                    <div className="text-sm text-gray-600">Freteiro 1</div>
                    <div className="font-semibold text-gray-900">{imeiData.invoice.carrier.name}</div>
                  </div>
                )}
                {imeiData.invoice.carrier2 && (
                  <div>
                    <div className="text-sm text-gray-600">Freteiro 2</div>
                    <div className="font-semibold text-gray-900">{imeiData.invoice.carrier2.name}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
              <DollarSign size={20} />
              Detalhes na Invoice
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-sm text-gray-600">Quantidade</div>
                <div className="font-semibold text-gray-900">{imeiData.invoiceProduct.quantity}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Valor Unitário</div>
                <div className="font-semibold text-gray-900">{formatCurrency(imeiData.invoiceProduct.value)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Valor Total</div>
                <div className="font-bold text-lg text-green-600">{formatCurrency(imeiData.invoiceProduct.total)}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600">Status:</div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    imeiData.invoiceProduct.received
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {imeiData.invoiceProduct.received ? "Recebido" : "Pendente"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!imeiData && !notFound && !isSearching && (
        <div className="text-center py-12 text-gray-500">
          <Search size={64} className="mx-auto mb-4 opacity-20" />
          <p>Selecione ou digite um IMEI e clique em Buscar para ver as informações</p>
          {allImeis.length > 0 && (
            <p className="mt-2 text-sm">Ou clique no campo acima para ver todos os IMEIs disponíveis</p>
          )}
        </div>
      )}
    </div>
  );
}
