"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import aiModelsApi from "@/lib/api/ai-models.api";
import { parseError } from '@/lib/api/parseError';
import { AiModelConfiguration } from "@/types/ai-models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, Power, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from 'react-toastify';
import AiModelCard from "./ai-model-card";
import AiModelForm from "./ai-model-form";

export default function AiModelsTab() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AiModelConfiguration | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<number, boolean>>({});
  const queryClient = useQueryClient();

  // Fetch AI models
  const { data: aiModels = [], isLoading } = useQuery({
    queryKey: ['ai-models'],
    queryFn: aiModelsApi.getAllAiModels,
  });

  // Set default model mutation
  const setDefaultMutation = useMutation({
    mutationFn: aiModelsApi.setDefaultAiModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
      toast.success('Default AI model updated successfully');
    },
    onError: (error) => {
      toast.error(parseError(error, 'Failed to set default model'));
    },
  });

  // Toggle model status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: aiModelsApi.toggleAiModelStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
      toast.success('Model status updated successfully');
    },
    onError: (error) => {
      toast.error(parseError(error, 'Failed to update model status'));
    },
  });

  // Delete model mutation
  const deleteMutation = useMutation({
    mutationFn: aiModelsApi.deleteAiModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
      toast.success('AI model deleted successfully');
    },
    onError: (error) => {
      toast.error(parseError(error, 'Failed to delete model'));
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: aiModelsApi.testAiModelConnection,
    onSuccess: (success) => {
      if (success) {
        toast.success('Connection test successful');
      } else {
        toast.error('Connection test failed');
      }
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
    },
    onError: (error) => {
      toast.error(parseError(error, 'Connection test failed'));
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
    },
  });

  const handleSetDefault = (modelId: number) => {
    setDefaultMutation.mutate(modelId);
  };

  const handleToggleStatus = (modelId: number) => {
    toggleStatusMutation.mutate(modelId);
  };

  const handleDelete = (modelId: number) => {
    if (confirm('Are you sure you want to delete this AI model? This action cannot be undone.')) {
      deleteMutation.mutate(modelId);
    }
  };

  const handleTestConnection = (modelId: number) => {
    testConnectionMutation.mutate(modelId);
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['ai-models'] });
  };

  const handleEditSuccess = () => {
    handleTestConnection(editingModel!.id);
    setEditingModel(null);
    queryClient.invalidateQueries({ queryKey: ['ai-models'] });
  };

  const toggleApiKeyVisibility = (modelId: number) => {
    setShowApiKeys(prev => ({
      ...prev,
      [modelId]: !prev[modelId]
    }));
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

  const activeModels = aiModels.filter(model => model.isActive);
  const inactiveModels = aiModels.filter(model => !model.isActive);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      {/* <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Model Configuration
              </CardTitle>
              <CardDescription>
                Configure AI model providers and their settings. Set API keys, default models, and parameters.
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add AI Model
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New AI Model</DialogTitle>
                </DialogHeader>
                <AiModelForm onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{aiModels.length}</div>
              <div className="text-sm text-blue-600">Total Models</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{activeModels.length}</div>
              <div className="text-sm text-green-600">Active Models</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {defaultModel ? '1' : '0'}
              </div>
              <div className="text-sm text-purple-600">Default Model</div>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Default Model */}
      {/* {defaultModel && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Default AI Model
            </CardTitle>
            <CardDescription>
              This model is used as the default for AI operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AiModelCard
              model={defaultModel}
              onSetDefault={handleSetDefault}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              onTestConnection={handleTestConnection}
              onEdit={setEditingModel}
              showApiKey={showApiKeys[defaultModel.id]}
              onToggleApiKey={() => toggleApiKeyVisibility(defaultModel.id)}
              isDefault={true}
            />
          </CardContent>
        </Card>
      )} */}

      {/* Active Models */}
      {activeModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5 text-green-500" />
              Active Models
            </CardTitle>
            <CardDescription>
              Currently active AI models available for use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {activeModels
                .map((model) => (
                  <AiModelCard
                    key={model.id}
                    model={model}
                    onSetDefault={handleSetDefault}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDelete}
                    onTestConnection={handleTestConnection}
                    onEdit={setEditingModel}
                    showApiKey={showApiKeys[model.id]}
                    isDefault={model.isDefault}
                    onToggleApiKey={() => toggleApiKeyVisibility(model.id)}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inactive Models */}
      {inactiveModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              Inactive Models
            </CardTitle>
            <CardDescription>
              Disabled AI models that are not currently in use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {inactiveModels.map((model) => (
                <AiModelCard
                  key={model.id}
                  model={model}
                  onSetDefault={handleSetDefault}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                  onTestConnection={handleTestConnection}
                  onEdit={setEditingModel}
                  showApiKey={showApiKeys[model.id]}
                  onToggleApiKey={() => toggleApiKeyVisibility(model.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Models State */}
      {aiModels.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No AI Models Configured
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by adding your first AI model configuration
              </p>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First AI Model
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New AI Model</DialogTitle>
                  </DialogHeader>
                  <AiModelForm onSuccess={handleCreateSuccess} />
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Model Dialog */}
      {editingModel && (
        <Dialog open={!!editingModel} onOpenChange={() => setEditingModel(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit AI Model</DialogTitle>
            </DialogHeader>
            <AiModelForm
              model={editingModel}
              onSuccess={handleEditSuccess}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}