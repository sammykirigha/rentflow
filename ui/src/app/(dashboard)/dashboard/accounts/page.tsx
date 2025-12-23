"use client";

import UpdateUserProfileForm from "@/components/forms/update-user-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

export default function UsersPage() {
    return (
        <div className="space-y-6">
            <Card>
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
        </div>
    );
}