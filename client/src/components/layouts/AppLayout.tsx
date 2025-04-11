import { useState, ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, User, Settings, LogOut, Home, GamepadIcon, Users, UserPlus, Info } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { user, logout } = useAuth();
  const [location] = useLocation();

  // Initialize dark mode based on saved preference or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    setIsDarkMode(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center flex-shrink-0">
              <Link href="/">
                <span className="text-3xl font-bold font-game cursor-pointer">
                  <GamepadIcon className="inline-block mr-2" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-secondary-500">Bingo</span>
                  <span className="text-accent-500">学</span>
                </span>
              </Link>
            </div>
            <nav className="hidden md:ml-10 md:flex space-x-6">
              <Link href="/">
                <a className={`font-medium transition ${location === "/" ? "text-primary-500" : "text-gray-600 hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400"}`}>Home</a>
              </Link>
              <Link href="/game/create">
                <a className={`font-medium transition ${location === "/game/create" ? "text-primary-500" : "text-gray-600 hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400"}`}>Create Game</a>
              </Link>
              {user?.isAdmin && (
                <Link href="/admin">
                  <a className={`font-medium transition ${location.startsWith("/admin") ? "text-primary-500" : "text-gray-600 hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400"}`}>Admin</a>
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {/* Dark Mode Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="rounded-full text-gray-600 dark:text-gray-300">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            
            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full p-0 h-8 w-8">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} alt={user.displayName} />
                      <AvatarFallback>{user.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm font-medium text-center">
                    {user.displayName}
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="default">Login</Button>
              </Link>
            )}
          </div>
        </div>
        
        {/* Mobile menu */}
        <div className="md:hidden p-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
          <div className="flex justify-around">
            <Link href="/">
              <a className={`text-center px-3 py-2 ${location === "/" ? "text-primary-500" : "text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400"}`}>
                <Home className="block mx-auto text-xl" />
                <span className="text-xs mt-1 block">Home</span>
              </a>
            </Link>
            <Link href="/game/create">
              <a className={`text-center px-3 py-2 ${location === "/game/create" ? "text-primary-500" : "text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400"}`}>
                <GamepadIcon className="block mx-auto text-xl" />
                <span className="text-xs mt-1 block">My Games</span>
              </a>
            </Link>
            {user?.isAdmin ? (
              <Link href="/admin">
                <a className={`text-center px-3 py-2 ${location.startsWith("/admin") ? "text-primary-500" : "text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400"}`}>
                  <Users className="block mx-auto text-xl" />
                  <span className="text-xs mt-1 block">Admin</span>
                </a>
              </Link>
            ) : (
              <Link href="/join">
                <a className={`text-center px-3 py-2 ${location === "/join" ? "text-primary-500" : "text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400"}`}>
                  <UserPlus className="block mx-auto text-xl" />
                  <span className="text-xs mt-1 block">Join</span>
                </a>
              </Link>
            )}
            <Link href="/about">
              <a className={`text-center px-3 py-2 ${location === "/about" ? "text-primary-500" : "text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400"}`}>
                <Info className="block mx-auto text-xl" />
                <span className="text-xs mt-1 block">About</span>
              </a>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© {new Date().getFullYear()} Bingo学 - Japanese Learning Bingo Game</p>
        </div>
      </footer>
    </div>
  );
}
