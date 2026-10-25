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

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
