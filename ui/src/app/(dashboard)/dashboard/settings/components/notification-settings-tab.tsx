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
import { AlertTriangle, Bell, Mail, MessageSquare, Save, Shield, Users } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  adminAlerts: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export default function NotificationSettingsTab() {
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emailNotifications: settings?.emailNotifications ?? true,
      smsNotifications: settings?.smsNotifications ?? false,
      adminAlerts: settings?.adminAlerts ?? true,
    },
  });

  // Update form when settings load
  React.useEffect(() => {
    if (settings) {
      form.reset({
        emailNotifications: settings.emailNotifications,
        smsNotifications: settings.smsNotifications,
        adminAlerts: settings.adminAlerts,
      });
    }
  }, [settings, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<SystemSetting>) => settingsApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Notification settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update notification settings');
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
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure email and notification preferences for your platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* User Notifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Notifications
                </h3>

                <FormField
                  control={form.control}
                  name="emailNotifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Notifications
                        </FormLabel>
                        <FormDescription>
                          Send email notifications to users for important events like account updates,
                          password resets, and system announcements
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
                  name="smsNotifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          SMS Notifications
                        </FormLabel>
                        <FormDescription>
                          Send SMS notifications for critical events. Requires SMS service configuration.
                          Additional charges may apply.
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
              </div>

              {/* Admin Notifications */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Notifications
                </h3>

                <FormField
                  control={form.control}
                  name="adminAlerts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Admin Alerts
                        </FormLabel>
                        <FormDescription>
                          Receive notifications about system events, security alerts, user registrations,
                          and other administrative activities
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
                      Save Notification Settings
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