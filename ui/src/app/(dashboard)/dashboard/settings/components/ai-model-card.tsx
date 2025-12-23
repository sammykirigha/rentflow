"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import aiModelsApi from "@/lib/api/ai-models.api";
import { AI_PROVIDER_INFO, AiModelConfiguration } from "@/types/ai-models";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  MoreVertical,
  Star,
  TestTube,
  Trash2,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AiModelCardProps {
  model: AiModelConfiguration;
  onSetDefault: (id: number) => void;
  onToggleStatus: (id: number) => void;
  onDelete: (id: number) => void;
  onTestConnection: (id: number) => void;
  onEdit: (model: AiModelConfiguration) => void;
  showApiKey?: boolean;
  onToggleApiKey: () => void;
  isDefault?: boolean;
}

export default function AiModelCard({
  model,
  onSetDefault,
  onToggleStatus,
  onDelete,
  onTestConnection,
  onEdit,
  showApiKey = false,
  onToggleApiKey,
  isDefault = false,
}: AiModelCardProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(false);

  const providerInfo = AI_PROVIDER_INFO[model.provider];

  // Get API key mutation
  const getApiKeyMutation = useMutation({
    mutationFn: () => aiModelsApi.getAiModelApiKey(model.id),
    onSuccess: (key) => {
      setApiKey(key);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to retrieve API key');
    },
  });

  const handleToggleApiKey = async () => {
    if (!showApiKey && !apiKey) {
      setIsLoadingApiKey(true);
      try {
        await getApiKeyMutation.mutateAsync();
      } finally {
        setIsLoadingApiKey(false);
      }
    }
    onToggleApiKey();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = () => {
    if (isDefault) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (model.isActive) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = () => {
    if (isDefault) return <Star className="h-3 w-3" />;
    if (model.isActive) return <CheckCircle className="h-3 w-3" />;
    return <XCircle className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (isDefault) return 'Default';
    if (model.isActive) return 'Active';
    return 'Inactive';
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${isDefault ? 'ring-2 ring-yellow-200' : ''
      }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${providerInfo.color}`}>
              <span className="text-lg">{providerInfo.icon}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{model.displayName}</h3>
                <Badge variant="outline" className={getStatusColor()}>
                  {getStatusIcon()}
                  <span className="ml-1">{getStatusText()}</span>
                </Badge>

                <div className="flex items-center gap-1">
                  {(model.lastConnectionSuccessful && model.lastConnectionAt) && (
                    <Badge variant="default">
                      Last connected: {formatDate(model.lastConnectionAt)}
                    </Badge>
                  )}
                  {model.lastConnectionError && (
                    <Badge variant="destructive">
                      Error: {model.lastConnectionError}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {providerInfo.name} • {model.modelName}
              </p>
              {model.description && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {model.description}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(model)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Model
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTestConnection(model.id)}>
                <TestTube className="h-4 w-4 mr-2" />
                Test Connection
              </DropdownMenuItem>
              {!isDefault && (
                <DropdownMenuItem onClick={() => onSetDefault(model.id)}>
                  <Star className="h-4 w-4 mr-2" />
                  Set as Default
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(model.id)}
                className="text-red-600 focus:text-red-600"
                disabled={isDefault}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Model
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Model Parameters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Max Tokens</span>
            <p className="font-medium">{model.maxTokens.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500">Temperature</span>
            <p className="font-medium">{model.temperature}</p>
          </div>
          <div>
            <span className="text-gray-500">Top P</span>
            <p className="font-medium">{model.topP}</p>
          </div>
          <div>
            <span className="text-gray-500">Created</span>
            <p className="font-medium">{formatDate(model.createdAt)}</p>
          </div>
        </div>

        {/* Token Pricing Configuration */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Token Pricing</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Input Cost</span>
              <p className="font-medium">{model.inputCostPer1kTokens || 1.0} credits/1K</p>
            </div>
            <div>
              <span className="text-gray-500">Output Cost</span>
              <p className="font-medium">{model.outputCostPer1kTokens || 3.0} credits/1K</p>
            </div>
            <div>
              <span className="text-gray-500">Min Credits</span>
              <p className="font-medium">{model.minimumCredits || 1}</p>
            </div>
            <div>
              <span className="text-gray-500">Multiplier</span>
              <p className="font-medium">{model.modelMultiplier || 1.0}x</p>
            </div>
          </div>
        </div>

        {/* API Key Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">API Key</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleApiKey}
              disabled={isLoadingApiKey}
            >
              {isLoadingApiKey ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="ml-2">
                {showApiKey ? 'Hide' : 'Show'}
              </span>
            </Button>
          </div>

          <div className="bg-gray-50 rounded-md p-3">
            {showApiKey && apiKey ? (
              <code className="text-sm font-mono break-all">{apiKey}</code>
            ) : (
              <span className="text-sm text-gray-500">
                {'••••••••••••••••'}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Active</span>
            <Switch
              checked={model.isActive}
              onCheckedChange={() => onToggleStatus(model.id)}
              disabled={isDefault}
            />
          </div>

          <div className="flex items-center gap-2">

            {!isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSetDefault(model.id)}
              >
                <Star className="h-4 w-4 mr-2" />
                Set Default
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTestConnection(model.id)}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}