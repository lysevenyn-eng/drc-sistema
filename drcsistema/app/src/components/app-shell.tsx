"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import {
  IconDashboard,
  IconHerd,
  IconEarTag,
  IconRepro,
  IconScale,
  IconTasks,
  IconTrade,
  IconFinance,
  IconWallet,
  IconAdmin,
  IconReport,
  IconMenu,
  IconClose,
  IconLogout,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/icons";

const SIDEBAR_COLLAPSED_KEY = "drc-sidebar-collapsed";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  criador: "Criador",
  caseiro: "Cabanheiro",
};

const NAV = [
  { href: "/dashboard", label: "Visão geral", Icon: IconDashboard, adminOnly: false },
  { href: "/rebanho", label: "Rebanho", Icon: IconHerd, adminOnly: false },
  { href: "/abates-obitos", label: "Abates e óbitos", Icon: IconEarTag, adminOnly: false },
  { href: "/reproducao", label: "Reprodução e P.O.", Icon: IconRepro, adminOnly: false },
  { href: "/pesagem", label: "Pesagem", Icon: IconScale, adminOnly: false },
  { href: "/manejo", label: "Manejo e calendário", Icon: IconTasks, adminOnly: false },
  { href: "/relatorios", label: "Relatórios", Icon: IconReport, adminOnly: false },
  { href: "/compras-vendas", label: "Compras e vendas", Icon: IconTrade, adminOnly: true },
  { href: "/financeiro", label: "Financeiro", Icon: IconFinance, adminOnly: true },
  { href: "/carteira", label: "Carteira", Icon: IconWallet, adminOnly: true },
  { href: "/admin", label: "Administração", Icon: IconAdmin, adminOnly: true },
] as const;

type NavItem = (typeof NAV)[number];

// Estado do menu recolhido, sincronizado com localStorage via useSyncExternalStore
// (em vez de useState + useEffect) — evita divergência entre a renderização no
// servidor (sem acesso a localStorage) e a do navegador, e evita "setState" no
// corpo de um efeito.
const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(callback: () => void) {
  collapsedListeners.add(callback);
  return () => collapsedListeners.delete(callback);
}

function getCollapsedSnapshot() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function getCollapsedServerSnapshot() {
  return false;
}

function setCollapsedStore(value: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? "1" : "0");
  } catch {
    // ignora falha ao salvar a preferência (modo privado, etc.)
  }
  collapsedListeners.forEach((notify) => notify());
}

function NavLinks({
  items,
  pathname,
  onNavigate,
  collapsed = false,
}: {
  items: readonly NavItem[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav className={`flex flex-1 flex-col gap-1 ${collapsed ? "px-2" : "px-3"}`}>
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              collapsed ? "justify-center px-0" : ""
            } ${
              active
                ? "bg-drc-gold-500 text-drc-green-950"
                : "text-drc-cream-100/85 hover:bg-white/10"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  userName,
  role,
  farmName,
}: {
  children: React.ReactNode;
  userName: string;
  role: "admin" | "criador" | "caseiro";
  farmName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot
  );

  function toggleCollapsed() {
    setCollapsedStore(!collapsed);
  }

  const items = NAV.filter((item) => !item.adminOnly || role === "admin");

  return (
    <div className="flex min-h-screen bg-drc-cream-100">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col bg-drc-green-950 py-6 transition-[width] duration-200 md:flex ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className={`flex items-center gap-3 pb-6 ${collapsed ? "justify-center px-2" : "px-4"}`}>
          <Image
            src="/drc-logo.png"
            alt="DRC"
            width={44}
            height={44}
            className="shrink-0 rounded-full"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">DRC</p>
              <p className="truncate text-xs text-drc-cream-100/60">{farmName}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className={`mx-3 mb-4 flex items-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-medium text-drc-cream-100/70 transition hover:bg-white/10 hover:text-white ${
            collapsed ? "justify-center px-0" : "px-3"
          }`}
        >
          {collapsed ? <IconChevronRight className="h-4 w-4 shrink-0" /> : <IconChevronLeft className="h-4 w-4 shrink-0" />}
          {!collapsed && "Recolher menu"}
        </button>

        <NavLinks items={items} pathname={pathname} collapsed={collapsed} />

        <div className={`mt-4 border-t border-white/10 pt-4 ${collapsed ? "px-2" : "px-4"}`}>
          {!collapsed && (
            <>
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="text-xs uppercase tracking-wide text-drc-gold-400">
                {ROLE_LABEL[role] ?? role}
              </p>
            </>
          )}
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              title="Sair"
              className={`flex items-center gap-2 text-sm text-drc-cream-100/70 hover:text-white ${
                collapsed ? "w-full justify-center" : ""
              }`}
            >
              <IconLogout className="h-4 w-4 shrink-0" />
              {!collapsed && "Sair"}
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-drc-green-950 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Image src="/drc-logo.png" alt="DRC" width={32} height={32} className="rounded-full" />
          <span className="text-sm font-semibold text-white">DRC</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="text-white"
        >
          <IconMenu />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-drc-green-950 py-6">
            <div className="flex items-center justify-between px-4 pb-6">
              <div className="flex items-center gap-3">
                <Image src="/drc-logo.png" alt="DRC" width={40} height={40} className="rounded-full" />
                <div>
                  <p className="text-sm font-semibold text-white">DRC</p>
                  <p className="text-xs text-drc-cream-100/60">{farmName}</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-white" aria-label="Fechar menu">
                <IconClose />
              </button>
            </div>
            <NavLinks items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="mt-4 border-t border-white/10 px-4 pt-4">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="text-xs uppercase tracking-wide text-drc-gold-400">
                {ROLE_LABEL[role] ?? role}
              </p>
              <form action={logoutAction} className="mt-3">
                <button type="submit" className="flex items-center gap-2 text-sm text-drc-cream-100/70">
                  <IconLogout className="h-4 w-4" />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 pb-16 pt-20 md:px-8 md:pb-10 md:pt-8">
        {children}
      </main>
    </div>
  );
}
