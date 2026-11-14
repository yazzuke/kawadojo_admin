import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { navGroups, navItems, canSeeNav, rememberVisit, type NavItem } from '../Utils/nav';

const COLLAPSED_KEY = 'kawadojo.nav.collapsed';
const loadCollapsed = (): string[] => {
  try { return JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]'); } catch { return []; }
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState<string[]>(loadCollapsed);

  const canSee = (item: NavItem) => canSeeNav(user?.role, item);

  // Anota cada página del menú que abres, para los accesos rápidos del Dashboard
  useEffect(() => {
    const item = navItems.find((i) => i.to === pathname);
    if (item && item.to !== '/dashboard') rememberVisit(item.to, item.label);
  }, [pathname]);
  const toggleGroup = (title: string) => {
    const next = collapsed.includes(title) ? collapsed.filter(t => t !== title) : [...collapsed, title];
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-kawa-black">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-kawa-gray border-r border-gray-800
        transform transition-transform duration-300 ease-in-out flex flex-col
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex-none flex items-center justify-between px-4 border-b border-gray-800">
          <span className="text-xl font-bold text-kawa-green">KawaDojo Admin</span>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {navGroups.map((group) => {
            const items = group.items.filter(canSee);
            if (!items.length) return null;
            // La sección de la página abierta nunca se esconde
            const hasActive = items.some((i) => pathname.startsWith(i.to));
            const isCollapsed = !!group.title && collapsed.includes(group.title) && !hasActive;
            return (
              <div key={group.title ?? 'inicio'}>
                {group.title && (
                  <button
                    onClick={() => toggleGroup(group.title!)}
                    className="w-full flex items-center justify-between px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300"
                  >
                    {group.title}
                    <ChevronDown size={14} className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                )}
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                          ${isActive
                            ? 'bg-kawa-green text-black font-medium'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }
                        `}
                      >
                        <item.icon size={18} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="flex-none p-4 border-t border-gray-800 bg-kawa-gray">
          <div className="text-sm text-gray-400 mb-2 truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="h-16 bg-kawa-gray border-b border-gray-800 flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white mr-4"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-white font-medium">Panel de Administración</h1>
        </header>

        {/* Page content */}
        <main className="p-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
