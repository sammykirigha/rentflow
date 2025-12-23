/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import settingsApi from "@/lib/api/settings.api";
import { uploadImage } from '@/lib/api/upload.api';
import { SystemSetting } from "@/types/settings";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings,
  Twitter,
  Upload,
  X
} from "lucide-react";
import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  platformName: z.string().min(1, "Platform name is required").max(255),
  supportEmail: z.string().email("Must be a valid email address"),
  appLogo: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  appFavicon: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  socialFacebook: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  socialTwitter: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  socialLinkedin: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  socialInstagram: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

export default function GeneralSettingsTab() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platformName: settings?.platformName || "",
      supportEmail: settings?.supportEmail || "",
      appLogo: settings?.appLogo || "",
      appFavicon: settings?.appFavicon || "",
      contactPhone: settings?.contactPhone || "",
      contactAddress: settings?.contactAddress || "",
      socialFacebook: settings?.socialFacebook || "",
      socialTwitter: settings?.socialTwitter || "",
      socialLinkedin: settings?.socialLinkedin || "",
      socialInstagram: settings?.socialInstagram || "",
    },
  });

  // Update form when settings load
  React.useEffect(() => {
    if (settings) {
      form.reset({
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        appLogo: settings.appLogo || "",
        appFavicon: settings.appFavicon || "",
        contactPhone: settings.contactPhone || "",
        contactAddress: settings.contactAddress || "",
        socialFacebook: settings.socialFacebook || "",
        socialTwitter: settings.socialTwitter || "",
        socialLinkedin: settings.socialLinkedin || "",
        socialInstagram: settings.socialInstagram || "",
      });
    }
  }, [settings, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<SystemSetting>) => settingsApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('General settings updated successfully');
      setHasUnsavedChanges(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate({
      platformName: data.platformName,
      supportEmail: data.supportEmail,
      appLogo: data.appLogo || undefined,
      appFavicon: data.appFavicon || undefined,
      contactPhone: data.contactPhone || undefined,
      contactAddress: data.contactAddress || undefined,
      socialFacebook: data.socialFacebook || undefined,
      socialTwitter: data.socialTwitter || undefined,
      socialLinkedin: data.socialLinkedin || undefined,
      socialInstagram: data.socialInstagram || undefined,
    });
  };

  const handleFieldChange = () => {
    setHasUnsavedChanges(true);
  };

  const clearImage = (field: 'appLogo' | 'appFavicon') => {
    form.setValue(field, '');
    handleFieldChange();
  };

  const handleFileUpload = async (file: File, field: 'appLogo' | 'appFavicon') => {
    const setUploading = field === 'appLogo' ? setIsUploadingLogo : setIsUploadingFavicon;

    setUploading(true);
    try {
      const result = await uploadImage(file);
      if (result?.fullUrl) {
        form.setValue(field, result.fullUrl);
        handleFieldChange();
        toast.success(`${field === 'appLogo' ? 'Logo' : 'Favicon'} uploaded successfully`);
      } else {
        toast.error(`Failed to upload ${field === 'appLogo' ? 'logo' : 'favicon'}`);
      }
    } catch {
      toast.error(`Error uploading ${field === 'appLogo' ? 'logo' : 'favicon'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (field: 'appLogo' | 'appFavicon') => {
    const inputRef = field === 'appLogo' ? logoInputRef : faviconInputRef;
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, field: 'appLogo' | 'appFavicon') => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, GIF, WebP, or SVG)');
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 5MB');
        return;
      }

      handleFileUpload(file, field);
    }
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Configure basic platform information, branding, and contact details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Platform Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Platform Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="platformName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Edu AI Platform"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange();
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          The name of your platform displayed throughout the application
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supportEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Support Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="support@example.com"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange();
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Primary email address for customer support and inquiries
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Branding & Visual Identity */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium">Branding & Visual Identity</h3>

                <FormField
                  control={form.control}
                  name="appLogo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform Logo</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://example.com/logo.png"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                handleFieldChange();
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleFileSelect('appLogo')}
                              disabled={isUploadingLogo}
                            >
                              {isUploadingLogo ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          {field.value && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="shrink-0">
                                <img
                                  src={field.value}
                                  alt="Platform Logo Preview"
                                  className="h-12 w-auto max-w-[200px] object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Logo Preview</p>
                                <p className="text-xs text-gray-500 truncate">{field.value}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => clearImage('appLogo')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Upload or enter URL to your platform logo. Recommended size: 200x60px or similar aspect ratio. Max 5MB.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="appFavicon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Favicon</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://example.com/favicon.ico"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                handleFieldChange();
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleFileSelect('appFavicon')}
                              disabled={isUploadingFavicon}
                            >
                              {isUploadingFavicon ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          {field.value && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="shrink-0">
                                <img
                                  src={field.value}
                                  alt="Favicon Preview"
                                  className="h-8 w-8 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Favicon Preview</p>
                                <p className="text-xs text-gray-500 truncate">{field.value}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => clearImage('appFavicon')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Upload or enter URL to your favicon. Recommended formats: .ico, .png (16x16 or 32x32px). Max 5MB.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Information */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </h3>

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleFieldChange();
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Phone number for customer support (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="123 Main St, City, State 12345"
                          rows={3}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleFieldChange();
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Physical address for your organization (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Social Media Links */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium">Social Media Links</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="socialFacebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Facebook className="h-4 w-4 text-blue-600" />
                          Facebook
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://facebook.com/yourpage"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialTwitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Twitter className="h-4 w-4 text-blue-400" />
                          Twitter
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://twitter.com/yourhandle"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Linkedin className="h-4 w-4 text-blue-700" />
                          LinkedIn
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://linkedin.com/company/yourcompany"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialInstagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-600" />
                          Instagram
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://instagram.com/yourhandle"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Platform Preview */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium">Platform Preview</h3>
                <div className="p-6 bg-linear-to-r from-purple-50 to-blue-50 rounded-lg border">
                  <div className="flex items-center gap-4 mb-4">
                    {form.watch('appLogo') ? (
                      <img
                        src={form.watch('appLogo')}
                        alt="Logo Preview"
                        className="h-10 w-auto max-w-[150px] object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-10 w-20 bg-gray-200 rounded flex items-center justify-center">
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {form.watch('platformName') || 'Platform Name'}
                      </h2>
                      <p className="text-sm text-gray-600">AI-Powered Education Platform</p>
                    </div>
                  </div>

                  {/* Contact & Social Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700 mb-2">Contact</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span>{form.watch('supportEmail') || 'support@example.com'}</span>
                        </div>
                        {form.watch('contactPhone') && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{form.watch('contactPhone')}</span>
                          </div>
                        )}
                        {form.watch('contactAddress') && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-xs">{form.watch('contactAddress')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700 mb-2">Social Media</p>
                      <div className="flex gap-2">
                        {form.watch('socialFacebook') && (
                          <Facebook className="h-4 w-4 text-blue-600" />
                        )}
                        {form.watch('socialTwitter') && (
                          <Twitter className="h-4 w-4 text-blue-400" />
                        )}
                        {form.watch('socialLinkedin') && (
                          <Linkedin className="h-4 w-4 text-blue-700" />
                        )}
                        {form.watch('socialInstagram') && (
                          <Instagram className="h-4 w-4 text-pink-600" />
                        )}
                        {!form.watch('socialFacebook') && !form.watch('socialTwitter') &&
                          !form.watch('socialLinkedin') && !form.watch('socialInstagram') && (
                            <span className="text-gray-400 text-xs">No social links configured</span>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Unsaved Changes Warning */}
              {hasUnsavedChanges && (
                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    You have unsaved changes
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        form.reset();
                        setHasUnsavedChanges(false);
                      }}
                    >
                      Discard
                    </Button>
                    <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              {!hasUnsavedChanges && (
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
                        Save General Settings
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Hidden file inputs */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, 'appLogo')}
        className="hidden"
      />
      <input
        ref={faviconInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, 'appFavicon')}
        className="hidden"
      />
    </div>
  );
}