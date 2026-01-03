import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityIcon } from "lucide-react";
import { ActivityLogsTable } from "./components/activity-logs-table";

const ActivityLogs = () => {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ActivityIcon className="h-5 w-5" />
                        Avtivity Management
                    </CardTitle>
                    <CardDescription>
                        Monitor and review user activities and system logs for security and compliance
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ActivityLogsTable />
                </CardContent>
            </Card>
        </div>
    );
};

export default ActivityLogs;
