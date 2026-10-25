"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AtSign,
  Bell,
  Braces,
  CreditCard,
  DatabaseBackup,
  FileText,
  Gift,
  LayoutGrid,
  MonitorPlay,
  Tags,
  Image as ImageIcon,
  Kanban,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Newspaper,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Settings,
  ShoppingCart,
  Star,
  Ticket,
  TicketPercent,
  Users,
} from "lucide-react";
import { NAV_GROUPS, isPinnedNav, navModules, type KitModule } from "@/lib/catalog";
import { useStore } from "@/components/store";
import { BrandMark, api } from "@/components/admin-kit";

const ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  listings: LayoutGrid,
  categories: Tags,
  ads: MonitorPlay,
  "coupon-codes": Ticket,
  api: Braces,
  users: Users,
  orders: ShoppingCart,
  coupons: TicketPercent,
  crm: Kanban,
  campaigns: Send,
  affiliates: Gift,
  payments: CreditCard,
  content: FileText,
  media: ImageIcon,
  notifications: Bell,
  backups: DatabaseBackup,
  reviews: Star,
  branding: Palette,
  blog: Newspaper,
  email: AtSign,
  settings: Settings,
  feedback: MessageSquare,
  "social-proof": Megaphone,
};

const NAV_KEY = "sak-nav-collapsed";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout, hiddenSlugs, setFeatureOn } = useStore();
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    api<{ pending: number; pendingReviews: number; unreadMail?: number }>("/api/admin/stats")
      .then((stats) => setBadges({ listings: stats.pending, reviews: stats.pendingReviews, email: stats.unreadMail ?? 0 }))
      .catch(() => setBadges({}));
  }, [pathname]);
  const modules = navModules().filter((item) => isPinnedNav(item.slug) || !hiddenSlugs.includes(item.slug));
  const current = navModules().find((item) => (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)));
  const hiddenHere = current != null && !isPinnedNav(current.slug) && hiddenSlugs.includes(current.slug);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(NAV_KEY) === "1");
  }, []);

  function toggleNav() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(NAV_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className={`min-h-screen bg-[#f5f6fa] md:grid ${collapsed ? "md:grid-cols-[76px_minmax(0,1fr)]" : "md:grid-cols-[248px_minmax(0,1fr)]"}`}>
      <aside className="flex flex-col border-b border-[#e6e8ef] bg-white md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className={`flex items-center px-3 py-3 ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <Link href="/admin" className="px-2">
              <BrandMark />
            </Link>
          )}
          <button
            type="button"
            onClick={toggleNav}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            className="hidden rounded-lg p-2 text-[#667085] hover:bg-[#f5f6fa] hover:text-[#0b6e4f] md:inline-flex"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-2 pb-3 md:block md:min-h-0 md:flex-1 md:overflow-y-auto md:px-2 md:pb-2">
          {NAV_GROUPS.map((group) => {
            const items = modules.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="md:mb-2">
                <p className={`mb-0.5 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#98a2b3] ${collapsed ? "hidden" : "hidden md:block"}`}>
                  {group}
                </p>
                <div className="flex gap-1 md:block">
                  {items.map((item) => (
                    <NavItem
                      key={item.slug}
                      item={item}
                      pathname={pathname}
                      badge={badges[item.slug] ?? 0}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className={`hidden border-t border-[#eef0f4] md:block ${collapsed ? "px-2 py-2" : "px-3 py-3"}`}>
          {!collapsed && <p className="truncate px-2 text-sm text-[#667085]">{session?.email}</p>}
          <button
            type="button"
            title="Sign out"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            className={`flex items-center rounded-lg text-[#667085] hover:bg-[#f5f6fa] hover:text-[#1d2939] ${
              collapsed ? "w-full justify-center p-2" : "mt-1 w-full gap-2 px-2 py-2 text-base"
            }`}
          >
            <LogOut size={18} />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">
        {hiddenHere && current && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e6e8ef] bg-white px-4 py-3 text-sm text-[#344054]">
            <p>
              <span className="font-medium">{current.label}</span> is hidden from the menu. The page still works, and nothing was deleted.
            </p>
            <button type="button" onClick={() => setFeatureOn(current.slug, true)} className="font-medium text-[#0b6e4f]">
              Show in menu
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

function NavItem({
  item,
  pathname,
  badge,
  collapsed,
}: {
  item: KitModule;
  pathname: string;
  badge: number;
  collapsed: boolean;
}) {
  const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
  const Icon = ICONS[item.slug] ?? LayoutDashboard;
  return (
    <Link
      href={item.href}
      title={item.label}
      className={`relative flex items-center whitespace-nowrap rounded-lg text-[15px] ${
        collapsed ? "justify-center px-2 py-2 md:px-0" : "gap-2.5 px-3 py-1.5"
      } ${active ? "bg-[#e7f3ee] font-semibold text-[#0b6e4f]" : "text-[#344054] hover:bg-[#f5f6fa]"}`}
    >
      <Icon size={18} />
      <span className={collapsed ? "md:sr-only" : undefined}>{item.label}</span>
      {badge > 0 && !collapsed && (
        <span className="ml-auto rounded-full bg-[#f04438] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{badge}</span>
      )}
      {badge > 0 && collapsed && <span className="absolute right-2 top-1 hidden h-2 w-2 rounded-full bg-[#f04438] md:block" />}
    </Link>
  );
}
