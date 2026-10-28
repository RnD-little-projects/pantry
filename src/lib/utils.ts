// One rule for every place a password is set
export const MIN_PASSWORD_LENGTH = 8;

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
const money = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Receipt-style amount: 1240 -> "1,240.00"
export function formatMoney(value: number) {
  return money.format(value);
}

// An open order follows the price list; without a product price, the price stored on the line
export function currentUnitPrice(item: { productId?: unknown; unitPrice?: unknown }) {
  const product = item.productId as { price?: unknown } | null | undefined;
  if (product && typeof product === "object" && typeof product.price === "number") return product.price;
  return typeof item.unitPrice === "number" ? item.unitPrice : null;
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
