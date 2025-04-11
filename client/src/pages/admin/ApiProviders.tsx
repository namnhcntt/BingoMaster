import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import APIProviderList from '@/components/admin/APIProviderList';
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'wouter';

export default function ApiProviders() {
  const { user } = useAuth();

  // Redirect non-admin users
  if (!user || !user.isAdmin) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage API providers and test connections</p>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">API Providers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="providers" className="space-y-4">
          <APIProviderList />
        </TabsContent>
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>API Settings</CardTitle>
              <CardDescription>
                Configure global API settings and default preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg border-gray-300 dark:border-gray-700">
                <p className="text-muted-foreground">Coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
