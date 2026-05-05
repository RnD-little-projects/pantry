export const workspaceSessions = [
  {
    title: "Weekly Restock A",
    preview: "Ready for checkout",
    items: "12 items",
    updated: "2h ago",
    active: true,
  },
  {
    title: "Bulk Order Oct",
    preview: "Archived and reviewable",
    items: "27 items",
    updated: "1d ago",
    active: false,
  },
  {
    title: "Session History",
    preview: "Cross-check pricing trends",
    items: "18 sessions",
    updated: "4d ago",
    active: false,
  },
  {
    title: "Weekend Fill",
    preview: "Draft for tonight",
    items: "9 items",
    updated: "Today",
    active: false,
  },
] as const;

export const marketItems = [
  {
    name: "Hydroponic Kale",
    price: "$4.20",
    status: "Fresh",
    note: "Local greenhouse",
  },
  {
    name: "Organic Avocado (Unit)",
    price: "$2.15",
    status: "Fresh",
    note: "Weekly restock",
  },
  {
    name: "Almond Milk (Unsweetened)",
    price: "$3.89",
    status: "Fresh",
    note: "Shelf stable",
  },
  {
    name: "Artisanal Sourdough",
    price: "$6.50",
    status: "Archived",
    note: "Old batch",
  },
  {
    name: "Greek Yogurt (500g)",
    price: "$5.10",
    status: "Fresh",
    note: "Cold storage",
  },
  {
    name: "Whole Coffee Beans (Dark)",
    price: "$14.99",
    status: "Fresh",
    note: "Premium roast",
  },
] as const;
