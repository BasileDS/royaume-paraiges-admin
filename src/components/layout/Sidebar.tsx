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
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface SidebarProps {
  collapsed?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}

export function Sidebar({
  collapsed = false,
  showToggle = false,
  onToggle,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleLinkClick = () => {
    onNavigate?.();
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn("flex h-16 items-center border-b", collapsed ? "justify-center px-2" : "px-6")}>
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold"
          onClick={handleLinkClick}
        >
          <Trophy className="h-6 w-6 shrink-0" />
          {!collapsed && <span>Royaume Admin</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {navigationGroups.map((group, groupIndex) => (
          <div key={groupIndex} className={cn(groupIndex > 0 && "mt-4")}>
            {group.title && !collapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
            )}
            {group.title && collapsed && (
              <Separator className="my-2" />
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                const linkContent = (
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center rounded-lg text-sm font-medium transition-colors",
                      collapsed
                        ? "justify-center px-2 py-2"
                        : "gap-3 px-3 py-2",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && item.name}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.name} delayDuration={0}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <div key={item.name}>
                    {linkContent}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Separator />

      {/* Footer */}
      <div className={cn("p-2", !collapsed && "p-3")}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Deconnexion
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Deconnexion
          </Button>
        )}

        {showToggle && (
          <>
            <Separator className="my-2" />
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full text-muted-foreground"
                    onClick={onToggle}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Agrandir
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground"
                onClick={onToggle}
              >
                <ChevronsLeft className="h-4 w-4" />
                Reduire
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
