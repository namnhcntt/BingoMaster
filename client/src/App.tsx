import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/layouts/AppLayout";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminApiProviders from "@/pages/admin/ApiProviders";
import GameCreate from "@/pages/Game/Create";
import GameJoin from "@/pages/Game/Join";
import GamePlay from "@/pages/Game/Play";
import GameHost from "@/pages/Game/Host";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* Auth routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/api-providers" component={AdminApiProviders} />
      
      {/* Game routes */}
      <Route path="/game/create" component={GameCreate} />
      <Route path="/game/join/:gameId" component={GameJoin} />
      <Route path="/game/play/:gameId" component={GamePlay} />
      <Route path="/game/host/:gameId" component={GameHost} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppLayout>
          <Router />
        </AppLayout>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
