"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { UsersTable } from "./components";

export default function UsersPage() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						User Management
					</CardTitle>
					<CardDescription>
						Manage users, view user details, and control user access to the platform
					</CardDescription>
				</CardHeader>
				<CardContent>
					<UsersTable />
				</CardContent>
			</Card>
		</div>
	);
}