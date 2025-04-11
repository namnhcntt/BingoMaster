import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Define form schema for API provider
const apiProviderSchema = z.object({
  name: z.string().min(1, "Provider name is required"),
  type: z.string().min(1, "Provider type is required"),
  apiKey: z.string().min(1, "API key is required"),
  apiEndpoint: z.string().optional(),
  description: z.string().optional()
});

type ApiProviderFormValues = z.infer<typeof apiProviderSchema>;

interface ApiProviderFormProps {
  provider?: ApiProviderFormValues & { id: string };
  onSuccess: () => void;
}

export default function APIProviderForm({ provider, onSuccess }: ApiProviderFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!provider;

  // Form setup
  const form = useForm<ApiProviderFormValues>({
    resolver: zodResolver(apiProviderSchema),
    defaultValues: {
      name: provider?.name || '',
      type: provider?.type || 'openai',
      apiKey: provider?.apiKey || '',
      apiEndpoint: provider?.apiEndpoint || '',
      description: provider?.description || ''
    }
  });

  // Create provider mutation
  const createMutation = useMutation({
    mutationFn: async (values: ApiProviderFormValues) => {
      const response = await apiRequest('POST', '/api/admin/providers', values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Provider created",
        description: "API provider has been created successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/providers'] });
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to create provider",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update provider mutation
  const updateMutation = useMutation({
    mutationFn: async (values: ApiProviderFormValues) => {
      const response = await apiRequest('PUT', `/api/admin/providers/${provider?.id}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Provider updated",
        description: "API provider has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/providers'] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to update provider",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: ApiProviderFormValues) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Provider Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. OpenAI, Claude, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Provider Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI Compatible</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="custom">Custom Implementation</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem className="sm:col-span-6">
                <FormLabel>API Key</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter API key" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="apiEndpoint"
            render={({ field }) => (
              <FormItem className="sm:col-span-6">
                <FormLabel>API Endpoint (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. https://api.openai.com/v1/chat/completions" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-6">
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Brief description of the provider"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : (
              isEditing ? "Update Provider" : "Add Provider"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
