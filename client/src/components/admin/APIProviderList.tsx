import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import APIProviderForm from './APIProviderForm';
import { CircleCheckIcon, PencilIcon, TrashIcon, ServerIcon, NetworkIcon, BrainIcon } from 'lucide-react';

interface APIProvider {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  apiEndpoint?: string;
  description?: string;
  isActive: boolean;
}

export default function APIProviderList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingProvider, setEditingProvider] = useState<APIProvider | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Fetch providers
  const { data: providers, isLoading, error } = useQuery<APIProvider[]>({
    queryKey: ['/api/admin/providers'],
  });

  // Activate provider mutation
  const activateMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const response = await apiRequest('POST', `/api/admin/providers/${providerId}/activate`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Provider activated',
        description: 'The API provider has been set as active.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/providers'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to activate provider',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete provider mutation
  const deleteMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const response = await apiRequest('DELETE', `/api/admin/providers/${providerId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Provider deleted',
        description: 'The API provider has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/providers'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete provider',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Test API provider mutation
  const testApiMutation = useMutation({
    mutationFn: async ({ providerId, prompt }: { providerId: string; prompt: string }) => {
      const response = await apiRequest('POST', `/api/admin/providers/${providerId}/test`, { prompt });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'API test successful',
        description: 'The API provider responded successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'API test failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle edit provider
  const handleEdit = (provider: APIProvider) => {
    setEditingProvider(provider);
    setIsFormOpen(true);
  };

  // Handle form close
  const handleFormClose = () => {
    setEditingProvider(null);
    setIsFormOpen(false);
  };

  // Get provider icon based on type
  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'openai':
        return <ServerIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
      case 'openrouter':
        return <NetworkIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />;
      case 'deepseek':
        return <BrainIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />;
      default:
        return <ServerIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />;
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            Error loading API providers: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>API Providers</CardTitle>
            <CardDescription>
              Manage API providers for AI content generation
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>Add New Provider</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingProvider ? 'Edit API Provider' : 'Add New API Provider'}
                </DialogTitle>
              </DialogHeader>
              <APIProviderForm 
                provider={editingProvider || undefined} 
                onSuccess={handleFormClose} 
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers && providers.length > 0 ? (
                  providers.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                            {getProviderIcon(provider.type)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium">{provider.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {provider.description || `Type: ${provider.type}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {provider.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="bg-gray-100 dark:bg-gray-800 py-1 px-2 rounded text-sm">
                          {provider.apiKey.substring(0, 3)}...{provider.apiKey.substring(provider.apiKey.length - 4)}
                        </span>
                      </TableCell>
                      <TableCell className="space-x-2">
                        {!provider.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-400 hover:bg-green-50 dark:hover:bg-green-900"
                            onClick={() => activateMutation.mutate(provider.id)}
                            disabled={activateMutation.isPending}
                          >
                            <CircleCheckIcon className="h-4 w-4 mr-1" />
                            Activate
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(provider)}
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900"
                            >
                              <TrashIcon className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete API Provider</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{provider.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteMutation.mutate(provider.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      No API providers found. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Testing</CardTitle>
          <CardDescription>
            Test your API providers with a sample prompt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Test Prompt</label>
                <textarea
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800"
                  rows={3}
                  placeholder="Enter a test prompt for the selected provider"
                />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Testing with:{' '}
                    <strong>
                      {providers?.find((p) => p.isActive)?.name || 'No active provider'}
                    </strong>
                  </span>
                </div>
                <Button
                  disabled={!providers?.some((p) => p.isActive) || testApiMutation.isPending}
                  onClick={() => {
                    const activeProvider = providers?.find((p) => p.isActive);
                    if (activeProvider) {
                      const prompt = document.querySelector('textarea')?.value;
                      if (prompt) {
                        testApiMutation.mutate({ providerId: activeProvider.id, prompt });
                      } else {
                        toast({
                          title: 'Missing prompt',
                          description: 'Please enter a test prompt',
                          variant: 'destructive',
                        });
                      }
                    }
                  }}
                >
                  {testApiMutation.isPending ? (
                    <>
                      <Skeleton className="h-4 w-4 mr-2 rounded-full animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>Run Test</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
