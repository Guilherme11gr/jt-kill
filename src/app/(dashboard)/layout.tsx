'use client';

import Link from "next/link";
import * as React from "react";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Settings,
  LogOut,
  Zap,
  Menu,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogoutButton } from "@/components/layout/logout-button";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { TaskModalProvider } from "@/providers/task-modal-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: FolderKanban, label: "Projetos", href: "/projects" },
    { icon: CheckSquare, label: "Minhas Tasks", href: "/tasks" },
    { icon: Zap, label: "AI Scribe", href: "/scribe" },
    { icon: Users, label: "Equipe", href: "/settings/team" },
    { icon: Settings, label: "Configurações", href: "/settings" },
  ];

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card fixed h-full z-30">
        <div className="p-6 border-b border-border flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Jira Killer
          </h1>
        </div>

        {/* Org Switcher */}
        <div className="px-4 py-3 border-b border-border">
          <OrgSwitcher />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200"
            >
              <item.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-background z-40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">
            Jira Killer
          </span>
        </div>
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
          <SheetContent side="left" className="w-64 bg-card border-r border-border p-0">
            <div className="p-6 border-b border-border flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                Jira Killer
              </h1>
            </div>
            {/* Org Switcher - Mobile */}
            <div className="px-4 py-3 border-b border-border">
              <OrgSwitcher />
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {sidebarItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen bg-background">
        <div className="p-6 md:p-8 max-w-screen-2xl mx-auto">
          <TaskModalProvider>
            {children}
          </TaskModalProvider>
        </div>
      </main>
    </div>
  );
}
