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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import aiModelsApi from "@/lib/api/ai-models.api";
import {
  AI_MODEL_DEFAULTS,
  AI_PROVIDER_INFO,
  AiModelConfiguration,
  AiProvider,
  CreateAiModelDto,
  UpdateAiModelDto
} from "@/types/ai-models";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  provider: z.nativeEnum(AiProvider),
  modelName: z.string().min(1, "Model name is required").max(100),
  displayName: z.string().min(1, "Display name is required").max(100),
  description: z.string().optional(),
  apiEndpoint: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  apiKey: z.string().optional(),
  maxTokens: z.string().optional(),
  temperature: z.string().optional(),
  topP: z.string().optional(),
  frequencyPenalty: z.string().optional(),
  presencePenalty: z.string().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  // Token Pricing Configuration
  inputCostPer1kTokens: z.string().optional(),
  outputCostPer1kTokens: z.string().optional(),
  minimumCredits: z.string().optional(),
  modelMultiplier: z.string().optional(),
});
// .refine(data => {
//   if (data.maxTokens && isNaN(Number(data.maxTokens))) {
//     return false;
//   }
// });

type FormData = z.infer<typeof formSchema>;

interface AiModelFormProps {
  model?: AiModelConfiguration;
  onSuccess: () => void;
}

export default function AiModelForm({ model, onSuccess }: AiModelFormProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>(
    model?.provider || AiProvider.OPENAI
  );

  const isEditing = !!model;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: model?.provider || AiProvider.OPENAI,
      modelName: model?.modelName || "",
      displayName: model?.displayName || "",
      description: model?.description || "",
      apiEndpoint: model?.apiEndpoint || "",
      apiKey: "",
      maxTokens: (model?.maxTokens || AI_MODEL_DEFAULTS.maxTokens) + "",
      temperature: (model?.temperature || AI_MODEL_DEFAULTS.temperature) + "",
      topP: (model?.topP || AI_MODEL_DEFAULTS.topP) + "",
      frequencyPenalty: (model?.frequencyPenalty || AI_MODEL_DEFAULTS.frequencyPenalty) + "",
      presencePenalty: (model?.presencePenalty || AI_MODEL_DEFAULTS.presencePenalty) + "",
      isActive: model?.isActive ?? AI_MODEL_DEFAULTS.isActive,
      isDefault: model?.isDefault ?? AI_MODEL_DEFAULTS.isDefault,
      // Token Pricing Configuration
      inputCostPer1kTokens: (model?.inputCostPer1kTokens ?? 1.0) + "",
      outputCostPer1kTokens: (model?.outputCostPer1kTokens ?? 3.0) + "",
      minimumCredits: (model?.minimumCredits ?? 1) + "",
      modelMultiplier: (model?.modelMultiplier ?? 1.0) + "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateAiModelDto) => aiModelsApi.createAiModel(data),
    onSuccess: () => {
      toast.success('AI model created successfully');
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create AI model');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateAiModelDto) => aiModelsApi.updateAiModel(model!.id, data),
    onSuccess: () => {
      toast.success('AI model updated successfully');
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update AI model');
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData = {
      ...data,
      provider: data.provider,
      apiEndpoint: data.apiEndpoint || undefined,
      apiKey: data.apiKey || undefined,
      maxTokens: data.maxTokens ? Number(data.maxTokens) : undefined,
      temperature: data.temperature ? Number(data.temperature) : undefined,
      topP: data.topP ? Number(data.topP) : undefined,
      frequencyPenalty: data.frequencyPenalty ? Number(data.frequencyPenalty) : undefined,
      presencePenalty: data.presencePenalty ? Number(data.presencePenalty) : undefined,
      // Token Pricing Configuration
      inputCostPer1kTokens: data.inputCostPer1kTokens ? Number(data.inputCostPer1kTokens) : undefined,
      outputCostPer1kTokens: data.outputCostPer1kTokens ? Number(data.outputCostPer1kTokens) : undefined,
      minimumCredits: data.minimumCredits ? Number(data.minimumCredits) : undefined,
      modelMultiplier: data.modelMultiplier ? Number(data.modelMultiplier) : undefined,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleProviderChange = (provider: AiProvider) => {
    setSelectedProvider(provider);
    form.setValue('provider', provider);

    // Clear API endpoint if not custom provider
    if (provider !== AiProvider.CUSTOM) {
      form.setValue('apiEndpoint', '');
    }

    // Set suggested model names based on provider
    const providerInfo = AI_PROVIDER_INFO[provider];
    if (providerInfo.defaultModels.length > 0 && !isEditing) {
      form.setValue('modelName', providerInfo.defaultModels[0]);
    }
  };

  const requiresEndpoint = selectedProvider === AiProvider.CUSTOM;

  console.log(form.formState.errors);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Provider Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Provider Information</CardTitle>
            <CardDescription>
              Select the AI provider and configure basic model information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Provider *</FormLabel>
                  <Select
                    onValueChange={handleProviderChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(AI_PROVIDER_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{info.icon}</span>
                            <span>{info.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {info.description}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="modelName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., gpt-4, claude-3-opus"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The technical name of the AI model
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., GPT-4, Claude 3 Opus"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      User-friendly name shown in the interface
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the model's capabilities..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {requiresEndpoint && (
              <FormField
                control={form.control}
                name="apiEndpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Endpoint *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://api.example.com/v1/chat/completions"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Custom API endpoint for this provider
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Configuration</CardTitle>
            <CardDescription>
              Configure API access and authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        placeholder={isEditing ? "Leave empty to keep current key" : "Enter API key"}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {isEditing
                      ? "Leave empty to keep the current API key unchanged"
                      : "API key for authenticating with the provider"
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Model Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model Parameters</CardTitle>
            <CardDescription>
              Fine-tune the model&apos;s behavior and response characteristics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="maxTokens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Tokens: {field.value}</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value || AI_MODEL_DEFAULTS.maxTokens}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of tokens to generate in the response
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperature: {field.value}</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value || AI_MODEL_DEFAULTS.temperature}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Controls randomness: 0 is focused, 2 is very creative
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="topP"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Top P: {field.value}</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value || AI_MODEL_DEFAULTS.topP}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Nucleus sampling parameter
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequencyPenalty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency Penalty: {field.value}</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value || AI_MODEL_DEFAULTS.frequencyPenalty}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Reduces repetition of frequent tokens
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Token Pricing Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Token Pricing Configuration</CardTitle>
            <CardDescription>
              Configure credit costs based on token usage for this model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="inputCostPer1kTokens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Input Cost (per 1K tokens)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="1.0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Credits charged per 1000 input tokens
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outputCostPer1kTokens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Output Cost (per 1K tokens)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="3.0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Credits charged per 1000 output tokens
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="minimumCredits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Minimum Credits
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>The minimum number of credits charged for each request, regardless of how few tokens are used. This ensures a baseline cost even for very short interactions.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="1"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum credits charged per request
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Model Multiplier
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>A multiplier applied to the final cost calculation. Use values greater than 1 for premium/expensive models (e.g., 1.5x, 2x) or less than 1 for budget models (e.g., 0.5x). The final cost is calculated as: (token cost) × (model multiplier) × (user subscription multiplier).</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        placeholder="1.0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Multiplier for premium model pricing (0.1-10)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Settings</CardTitle>
            <CardDescription>
              Configure the model&apos;s availability and default status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel>Active Status</FormLabel>
                <FormDescription>
                  Make this model available for use
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel>Default Model</FormLabel>
                <FormDescription>
                  Set as the default model for AI operations
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem>
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
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? (isEditing ? 'Updating...' : 'Creating...')
              : (isEditing ? 'Update Model' : 'Create Model')
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}