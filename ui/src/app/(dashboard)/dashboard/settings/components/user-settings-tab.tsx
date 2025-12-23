"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import settingsApi from "@/lib/api/settings.api";
import { SystemSetting } from "@/types/settings";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Shield, UserPlus, Users } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  allowSignup: z.boolean(),
  requireVerification: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export default function UserSettingsTab() {
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      allowSignup: settings?.allowSignup ?? false,
      requireVerification: settings?.requireVerification ?? false,
    },
  });

  // Update form when settings load
  React.useEffect(() => {
    if (settings) {
      form.reset({
        allowSignup: settings.allowSignup,
        requireVerification: settings.requireVerification,
      });
    }
  }, [settings, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<SystemSetting>) => settingsApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('User settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user settings');
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const watchedValues = form.watch();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Registration Settings
          </CardTitle>
          <CardDescription>
            Configure user registration and verification requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Registration Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Registration Control
                </h3>

                <FormField
                  control={form.control}
                  name="allowSignup"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Allow User Registration
                        </FormLabel>
                        <FormDescription>
                          Enable new users to create accounts on your platform. When disabled,
                          only existing users can access the platform.
                        </FormDescription>
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

                <FormField
                  control={form.control}
                  name="requireVerification"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Require Email Verification
                        </FormLabel>
                        <FormDescription>
                          Require new users to verify their email address before accessing the platform.
                          Recommended for security and to prevent spam accounts.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!watchedValues.allowSignup}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end pt-6 border-t">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save User Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}