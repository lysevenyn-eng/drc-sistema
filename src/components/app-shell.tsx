"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import {
  IconDashboard,
  IconHerd,
  IconRepro,
  IconScale,
  IconTasks,
  IconTrade,
  IconFinance,
  IconWallet,
  IconAdmin,
  IconMenu,
  IconClose,
  IconLogout,
} from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Visão geral", Icon: IconDashboard, adminOnly: false },
  { href: "/rebanho", label: "Rebanho", Icon: IconHerd, adminOnly: false },
  { href: "/reproducao", label: "Reprodução e P.O.", Icon: IconRepro, adminOnly: false },
  { href: "/pesagem", label: "Pesagem", Icon: IconScale, adminOnly: false },
  { href: "/manejo", label: "Manejo e calendário", Icon: IconTasks, adminOnly: false },
  { href: "/compras-vendas", label: "Compras e vendas", Icon: IconTrade, adminOnly: false },
  { href: "/financeiro", label: "Financeiro", Icon: IconFinance, adminOnly: true },
  { href: "/carteira", label: "Carteira", Icon: IconWallet, adminOnly: true },
  { href: "/admin", label: "Administração", Icon: IconAdmin, adminOnly: true },
] as const;

type NavItem = (typeof NAV)[number];

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: readonly NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-drc-gold-500 text-drc-green-950"
                : "text-drc-cream-100/85 hover:bg-white/10"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{label}</span>
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
  role: "admin" | "criador";
  farmName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((item) => !item.adminOnly || role === "admin");

  return (
    <div className="flex min-h-screen bg-drc-cream-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-drc-green-950 py-6 md:flex">
        <div className="flex items-center gap-3 px-4 pb-6">
          <Image
            src="/drc-logo.png"
            alt="DRC"
            width={44}
            height={44}
            className="rounded-full"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">DRC</p>
            <p className="truncate text-xs text-drc-cream-100/60">{farmName}</p>
          </div>
        </div>
        <NavLinks items={items} pathname={pathname} />
        <div className="mt-4 border-t border-white/10 px-4 pt-4">
          <p className="truncate text-sm font-medium text-white">{userName}</p>
          <p className="text-xs uppercase tracking-wide text-drc-gold-400">
            {role === "admin" ? "Administrador" : "Criador"}
          </p>
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-drc-cream-100/70 hover:text-white"
            >
              <IconLogout className="h-4 w-4" />
              Sair
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
                {role === "admin" ? "Administrador" : "Criador"}
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
