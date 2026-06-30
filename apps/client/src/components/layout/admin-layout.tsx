import { Link, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { authApi } from "@/features/auth/auth.api";

export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  async function handleLogout() {
    await authApi.logout().catch(() => undefined);
    clear();
    navigate("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-40 flex items-center justify-between px-6 py-3">
        <Link to="/admin" className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold tracking-tight">
            Tri<span className="text-gradient-brand">bastion</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user?.name} <span className="text-xs uppercase text-primary">{user?.role}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>
      <div className="flex">
        <nav className="hidden w-56 shrink-0 flex-col gap-1 p-4 md:flex">
          <Link to="/admin" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white/5">
            <LayoutDashboard className="h-4 w-4" /> Quizzes
          </Link>
        </nav>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
