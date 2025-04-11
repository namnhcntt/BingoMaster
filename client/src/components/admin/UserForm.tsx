import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Define form schema for user management
const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  isAdmin: z.boolean().default(false)
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: UserFormValues & { id: number };
  onSuccess: () => void;
}

export default function UserForm({ user, onSuccess }: UserFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!user;

  // Form setup with conditional password validation
  const formSchema = isEditing 
    ? userSchema.extend({
        password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal(''))
      })
    : userSchema;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user?.email || '',
      displayName: user?.displayName || '',
      password: '',
      isAdmin: user?.isAdmin || false
    }
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const response = await apiRequest('POST', '/api/admin/users', values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "User has been created successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      // If password is empty, remove it from the request
      const updateData = { ...values };
      if (!updateData.password) delete updateData.password;
      
      const response = await apiRequest('PUT', `/api/admin/users/${user?.id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: UserFormValues) => {
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
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isEditing ? "New Password (leave blank to keep current)" : "Password"}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={isEditing ? "New password" : "Password"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isAdmin"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Administrator</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Give this user administrative privileges
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : (
              isEditing ? "Update User" : "Create User"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
