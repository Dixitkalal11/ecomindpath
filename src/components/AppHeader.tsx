import { Link, useRouter } from "@tanstack/react-router";
import { Leaf, LayoutDashboard, PlusCircle, LogOut, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const router = useRouter();
  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }
  return (
    <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3" aria-label="Main">
        <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Leaf className="size-5 text-primary" aria-hidden="true" /> EcoMind
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-1.5"><LayoutDashboard className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Dashboard</span></Button></Link>
          <Link to="/log"><Button variant="ghost" size="sm" className="gap-1.5"><PlusCircle className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Log</span></Button></Link>
          <Link to="/goals"><Button variant="ghost" size="sm" className="gap-1.5"><Target className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Goals</span></Button></Link>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out" className="gap-1.5">
            <LogOut className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </nav>
    </header>
  );
}
