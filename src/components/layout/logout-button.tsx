"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
    >
      <LogOut className="w-4 h-4" />
      <span className="text-sm">Sair</span>
    </Button>
  );
}
