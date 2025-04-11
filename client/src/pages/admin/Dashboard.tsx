import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Gamepad2, BrainCircuit, Activity } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();

  // Redirect non-admin users
  if (!user || !user.isAdmin) {
    return <Redirect to="/login" />;
  }

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery<{
    totalUsers: number;
    totalGames: number;
    activeGames: number;
    apiProviders: number;
  }>({
    queryKey: ['/api/admin/stats'],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, games, and API settings for Bingo学
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered accounts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.totalGames || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Created bingo games
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Games
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.activeGames || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Games in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              API Providers
            </CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.apiProviders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Configured AI services
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Tools</CardTitle>
              <CardDescription>
                Manage various aspects of the Bingo学 application
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center justify-between rounded-lg border p-4 space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                  <Users className="h-8 w-8 text-primary-700 dark:text-primary-300" />
                </div>
                <div className="text-center">
                  <h3 className="font-medium">User Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Create, edit or delete user accounts
                  </p>
                </div>
                <Link href="/admin/users">
                  <Button className="w-full">Manage Users</Button>
                </Link>
              </div>
              
              <div className="flex flex-col items-center justify-between rounded-lg border p-4 space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                  <BrainCircuit className="h-8 w-8 text-primary-700 dark:text-primary-300" />
                </div>
                <div className="text-center">
                  <h3 className="font-medium">API Providers</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure AI services for content generation
                  </p>
                </div>
                <Link href="/admin/api-providers">
                  <Button className="w-full">Manage Providers</Button>
                </Link>
              </div>
              
              <div className="flex flex-col items-center justify-between rounded-lg border p-4 space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                  <Gamepad2 className="h-8 w-8 text-primary-700 dark:text-primary-300" />
                </div>
                <div className="text-center">
                  <h3 className="font-medium">Game Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    View statistics and game performance
                  </p>
                </div>
                <Button className="w-full" variant="outline">Coming Soon</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="quick-actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Perform common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Link href="/admin/users">
                  <Button className="w-full">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                </Link>
                <Link href="/admin/api-providers">
                  <Button className="w-full">
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    Manage API Providers
                  </Button>
                </Link>
                <Link href="/game/create">
                  <Button className="w-full" variant="outline">
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    Create New Game
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
