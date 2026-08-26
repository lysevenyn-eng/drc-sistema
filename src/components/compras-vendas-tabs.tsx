import Link from "next/link";

const TABS = [
  { key: "compras", label: "Compras", href: "/compras-vendas" },
  { key: "despesas", label: "Despesas", href: "/compras-vendas/despesas" },
  { key: "vendas", label: "Vendas", href: "/compras-vendas/vendas" },
] as const;

export function ComprasVendasTabs({ active }: { active: "compras" | "despesas" | "vendas" }) {
  return (
    <div className="mb-6 flex gap-2 border-b border-drc-border">
      {TABS.map((tab) =>
        tab.key === active ? (
          <span
            key={tab.key}
            className="border-b-2 border-drc-gold-500 px-3 py-2 text-sm font-medium text-drc-green-950"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.key}
            href={tab.href}
            className="px-3 py-2 text-sm font-medium text-drc-green-900/60 hover:text-drc-green-900"
          >
            {tab.label}
          </Link>
        )
      )}
    </div>
  );
}
