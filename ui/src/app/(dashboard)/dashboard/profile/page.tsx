"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User } from "lucide-react";
import UpdateUserProfileForm from "./components/update-user-form";
import SecuritySettings from "./components/security-settings";

export default function UsersPage() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card className='rounded-sm'>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile Management
                    </CardTitle>
                    <CardDescription>
                        Update your profile
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UpdateUserProfileForm />
                </CardContent>
            </Card>

            {/* Security Settings Section */}
            <Card className='rounded-sm'>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Security Settings
                    </CardTitle>
                    <CardDescription>
                        Manage your account security and connected accounts
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SecuritySettings />
                </CardContent>
            </Card>
        </div>
    );
}