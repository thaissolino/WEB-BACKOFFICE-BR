import { listCatalog, type CatalogItem } from "../catalog/catalogApi";

export type ProductCategory = {
  id: string;
  code: number;
  name: string;
  parentId?: string;
  grade: string;
  commission: string;
  discount: string;
  profit: string;
  type: string;
  description: string;
  ncmSuggest: boolean;
  ncm: string;
  defaultDiscount: boolean;
  defaultDiscountValue: string;
  active: boolean;
};

export type FlatOption = {
  id: string;
  label: string;
  depth: number;
};

function asBool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  return fallback;
}

export function categoryFromCatalog(item: CatalogItem): ProductCategory {
  const payload = item.payload;
  const slug = String(payload.slug ?? "").trim() || String(item.code);
  const parentSlug = String(payload.parentSlug ?? "").trim();
  return {
    id: slug,
    code: item.code,
    name: item.name,
    parentId: parentSlug || undefined,
    grade: String(payload.grade ?? "Sem Grade"),
    commission: String(payload.commission ?? "0,00"),
    discount: String(payload.discount ?? "0,00"),
    profit: String(payload.profit ?? "0,00"),
    type: String(payload.type ?? "Produto c/ Controle de Estoque"),
    description: String(payload.description ?? ""),
    ncmSuggest: asBool(payload.ncmSuggest),
    ncm: String(payload.ncm ?? ""),
    defaultDiscount: asBool(payload.defaultDiscount),
    defaultDiscountValue: String(payload.defaultDiscountValue ?? ""),
    active: item.active,
  };
}

export function sortCategoryTree(rows: ProductCategory[]) {
  const byParent = new Map<string | undefined, ProductCategory[]>();
  const ids = new Set(rows.map((item) => item.id));
  rows.forEach((item) => {
    const key = item.parentId && ids.has(item.parentId) ? item.parentId : undefined;
    const list = byParent.get(key) ?? [];
    list.push(item);
    byParent.set(key, list);
  });
  const ordered: ProductCategory[] = [];
  function walk(parentId?: string) {
    (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.code - b.code)
      .forEach((item) => {
        ordered.push(item);
        walk(item.id);
      });
  }
  walk(undefined);
  return ordered;
}

export function categoryDepth(row: ProductCategory, all: ProductCategory[]) {
  let depth = 0;
  let current = row.parentId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    depth += 1;
    current = all.find((item) => item.id === current)?.parentId;
  }
  return depth;
}

export function toFlatOptions(rows: ProductCategory[]): FlatOption[] {
  return sortCategoryTree(rows).map((item) => ({
    id: item.id,
    label: item.name,
    depth: categoryDepth(item, rows),
  }));
}

export async function loadProductCategories(ativo?: boolean) {
  const items = await listCatalog("product_category", ativo);
  return items.map(categoryFromCatalog);
}

export function slugifyCategory(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "categoria";
}
