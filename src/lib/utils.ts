export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
const money = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Receipt-style amount: 1240 -> "1,240.00"
export function formatMoney(value: number) {
  return money.format(value);
}
