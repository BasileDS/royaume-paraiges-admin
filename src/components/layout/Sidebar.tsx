"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  FileText,
  Trophy,
  History,
  BarChart3,
  Users,
  Receipt,
  Beer,
  Building2,
  LogOut,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navigationGroups = [
  {
    title: null,
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "Utilisateurs",
    items: [
      { name: "Liste des utilisateurs", href: "/users", icon: Users },
    ],
  },
  {
    title: "Transactions",
    items: [
      { name: "Tickets de caisse", href: "/receipts", icon: Receipt },
    ],
  },
  {
    title: "Recompenses",
    items: [
      { name: "Recompenses", href: "/coupons", icon: Ticket },
      { name: "Templates", href: "/templates", icon: FileText },
      { name: "Tiers", href: "/rewards", icon: Trophy },
      { name: "Quetes", href: "/quests", icon: Target },
      { name: "Historique", href: "/history", icon: History },
    ],
  },
  {
    title: "Contenu",
    items: [
      { name: "Etablissements", href: "/content/establishments", icon: Building2 },
      { name: "Bieres", href: "/content/beers", icon: Beer },
    ],
  },
  {
    title: null,
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Trophy className="h-6 w-6" />
          <span>Royaume Admin</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigationGroups.map((group, groupIndex) => (
          <div key={groupIndex} className={cn(groupIndex > 0 && "mt-4")}>
            {group.title && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Separator />

      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Deconnexion
        </Button>
      </div>
    </div>
  );
}
