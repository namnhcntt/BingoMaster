import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UserList from '@/components/admin/UserList';
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'wouter';

export default function Users() {
  const { user } = useAuth();

  // Redirect non-admin users
  if (!user || !user.isAdmin) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Create, edit and manage user accounts</p>
      </div>

      <Tabs defaultValue="all-users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-users">All Users</TabsTrigger>
          <TabsTrigger value="admins">Administrators</TabsTrigger>
        </TabsList>
        <TabsContent value="all-users" className="space-y-4">
          <UserList />
        </TabsContent>
        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>Administrator Accounts</CardTitle>
              <CardDescription>
                View and manage users with administrative privileges
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Admin-filtered user list would go here, using the same component with a filter */}
              <UserList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
