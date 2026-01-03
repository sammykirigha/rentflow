"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Bot,
  Database,
  FileText,
  Settings,
  Upload,
  Users
} from "lucide-react";
import { useState } from "react";
import AiModelsTab from "./components/ai-models-tab";
import ContentSettingsTab from "./components/content-settings-tab";
import GeneralSettingsTab from "./components/general-settings-tab";
import NotificationSettingsTab from "./components/notification-settings-tab";
import UploadSettingsTab from "./components/upload-settings-tab";
import UserSettingsTab from "./components/user-settings-tab";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    {
      id: "general",
      label: "General",
      icon: Settings,
      description: "Platform info, branding, contact details, and social media",
    },
    {
      id: "ai-models",
      label: "AI Models",
      icon: Bot,
      description: "Configure AI model providers and settings",
    },
    {
      id: "upload",
      label: "File Upload",
      icon: Upload,
      description: "File upload limits and allowed types",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      description: "Email and notification preferences",
    },
    {
      id: "users",
      label: "User Settings",
      icon: Users,
      description: "User registration and verification settings",
    },
    {
      id: "content",
      label: "Content",
      icon: FileText,
      description: "Content generation and briefing settings",
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your platform configuration and preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-500">Last updated: Just now</span>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Tab Navigation */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Configuration Sections</CardTitle>
            <CardDescription>
              Select a section to configure your platform settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-2 h-auto p-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col items-center gap-2 p-3 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <div className="flex items-center gap-2">
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs font-medium">
                      {tab.label}
                    </span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Active Tab Description */}
          {/* <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {(() => {
                  const activeTabData = tabs.find(tab => tab.id === activeTab);
                  const Icon = activeTabData?.icon || Settings;
                  return (
                    <>
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {activeTabData?.label} Settings
                        </h3>
                        <p className="text-sm text-gray-600">
                          {activeTabData?.description}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card> */}

          {/* Tab Panels */}
          <TabsContent value="general" className="space-y-6">
            <GeneralSettingsTab />
          </TabsContent>

          <TabsContent value="ai-models" className="space-y-6">
            <AiModelsTab />
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <UploadSettingsTab />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettingsTab />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserSettingsTab />
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <ContentSettingsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}