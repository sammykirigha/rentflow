"use client";

import { Badge } from "@/components/ui/badge";
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
import settingsApi from "@/lib/api/settings.api";
import { SystemSetting } from "@/types/settings";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Save, Upload, X } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  maxFileUploadSize: z.number().min(1, "Must be at least 1 MB").max(100, "Cannot exceed 100 MB"),
  allowedFileTypes: z.array(z.string()).min(1, "At least one file type must be allowed"),
});

type FormData = z.infer<typeof formSchema>;

const COMMON_FILE_TYPES = [
  { value: 'pdf', label: 'PDF Documents', description: 'Portable Document Format' },
  { value: 'doc', label: 'Word Documents', description: 'Microsoft Word (.doc)' },
  { value: 'docx', label: 'Word Documents', description: 'Microsoft Word (.docx)' },
  { value: 'txt', label: 'Text Files', description: 'Plain text files' },
  { value: 'rtf', label: 'Rich Text', description: 'Rich Text Format' },
  { value: 'jpg', label: 'JPEG Images', description: 'JPEG image files' },
  { value: 'jpeg', label: 'JPEG Images', description: 'JPEG image files' },
  { value: 'png', label: 'PNG Images', description: 'PNG image files' },
  { value: 'gif', label: 'GIF Images', description: 'GIF image files' },
  { value: 'webp', label: 'WebP Images', description: 'WebP image files' },
  { value: 'svg', label: 'SVG Images', description: 'Scalable Vector Graphics' },
  { value: 'mp4', label: 'MP4 Videos', description: 'MP4 video files' },
  { value: 'mov', label: 'MOV Videos', description: 'QuickTime video files' },
  { value: 'avi', label: 'AVI Videos', description: 'AVI video files' },
  { value: 'mp3', label: 'MP3 Audio', description: 'MP3 audio files' },
  { value: 'wav', label: 'WAV Audio', description: 'WAV audio files' },
  { value: 'zip', label: 'ZIP Archives', description: 'ZIP compressed files' },
  { value: 'rar', label: 'RAR Archives', description: 'RAR compressed files' },
];

export default function UploadSettingsTab() {
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maxFileUploadSize: settings?.maxFileUploadSize || 10,
      allowedFileTypes: settings?.allowedFileTypes || ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png'],
    },
  });
  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedTypes = form.watch('allowedFileTypes') || [];

  // Update form when settings load
  React.useEffect(() => {
    if (settings) {
      form.reset({
        maxFileUploadSize: settings.maxFileUploadSize,
        allowedFileTypes: settings.allowedFileTypes || ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png'],
      });
    }
  }, [settings, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<SystemSetting>) => settingsApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Upload settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update upload settings');
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate({
      maxFileUploadSize: data.maxFileUploadSize,
      allowedFileTypes: data.allowedFileTypes,
    });
  };

  const toggleFileType = (fileType: string) => {
    const currentTypes = form.getValues('allowedFileTypes');
    if (currentTypes.includes(fileType)) {
      form.setValue('allowedFileTypes', currentTypes.filter(type => type !== fileType));
    } else {
      form.setValue('allowedFileTypes', [...currentTypes, fileType]);
    }
  };

  const addCustomFileType = () => {
    const customType = prompt('Enter custom file extension (without dot):');
    if (customType && customType.trim()) {
      const cleanType = customType.trim().toLowerCase().replace(/^\./, '');
      const currentTypes = form.getValues('allowedFileTypes');
      if (!currentTypes.includes(cleanType)) {
        form.setValue('allowedFileTypes', [...currentTypes, cleanType]);
      }
    }
  };

  const removeFileType = (fileType: string) => {
    const currentTypes = form.getValues('allowedFileTypes');
    form.setValue('allowedFileTypes', currentTypes.filter(type => type !== fileType));
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
            <Upload className="h-5 w-5" />
            File Upload Settings
          </CardTitle>
          <CardDescription>
            Configure file upload limits and allowed file types for your platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Upload Size Limit */}
              <FormField
                control={form.control}
                name="maxFileUploadSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum File Size (MB) *</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          placeholder="10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                        <span className="text-sm text-gray-500">MB</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Maximum file size allowed for uploads. Range: 1-100 MB
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Types Selection */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Allowed File Types</h3>
                    <p className="text-sm text-gray-600">
                      Select which file types users can upload to your platform
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomFileType}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom
                  </Button>
                </div>

                {/* Currently Selected Types */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Selected Types:</span>
                    <Badge variant="secondary">{selectedTypes.length} types</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTypes.map((type) => (
                      <Badge
                        key={type}
                        variant="default"
                        className="flex items-center gap-1"
                      >
                        .{type}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => removeFileType(type)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* File Type Categories */}
                <div className="grid gap-4">
                  {/* Documents */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {COMMON_FILE_TYPES
                        .filter(type => ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(type.value))
                        .map((fileType) => (
                          <Button
                            key={fileType.value}
                            type="button"
                            variant={selectedTypes.includes(fileType.value) ? "default" : "outline"}
                            size="sm"
                            className="justify-start h-auto p-3"
                            onClick={() => toggleFileType(fileType.value)}
                          >
                            <div className="text-left">
                              <div className="font-medium">.{fileType.value}</div>
                              <div className="text-xs opacity-70">{fileType.label}</div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>

                  {/* Images */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Images
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {COMMON_FILE_TYPES
                        .filter(type => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type.value))
                        .map((fileType) => (
                          <Button
                            key={fileType.value}
                            type="button"
                            variant={selectedTypes.includes(fileType.value) ? "default" : "outline"}
                            size="sm"
                            className="justify-start h-auto p-3"
                            onClick={() => toggleFileType(fileType.value)}
                          >
                            <div className="text-left">
                              <div className="font-medium">.{fileType.value}</div>
                              <div className="text-xs opacity-70">{fileType.label}</div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>

                  {/* Media & Archives */}
                  <div className="space-y-3 hidden">
                    <h4 className="font-medium text-gray-900">Media & Archives</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {COMMON_FILE_TYPES
                        .filter(type => ['mp4', 'mov', 'avi', 'mp3', 'wav', 'zip', 'rar'].includes(type.value))
                        .map((fileType) => (
                          <Button
                            key={fileType.value}
                            type="button"
                            variant={selectedTypes.includes(fileType.value) ? "default" : "outline"}
                            size="sm"
                            className="justify-start h-auto p-3"
                            onClick={() => toggleFileType(fileType.value)}
                          >
                            <div className="text-left">
                              <div className="font-medium">.{fileType.value}</div>
                              <div className="text-xs opacity-70">{fileType.label}</div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Preview */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium">Upload Configuration Summary</h3>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Maximum File Size</p>
                      <p className="text-lg font-bold text-blue-700">
                        {form.watch('maxFileUploadSize')} MB
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Allowed File Types</p>
                      <p className="text-lg font-bold text-blue-700">
                        {selectedTypes.length} types
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-blue-800">
                      Users can upload: {selectedTypes.map(type => `.${type}`).join(', ')}
                    </p>
                  </div>
                </div>
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
                      Save Upload Settings
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