/* eslint-disable @typescript-eslint/no-empty-object-type */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditLogResponse } from "@/lib/api/audit.api";
import { auditApi } from "@/lib/api/audit.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import { useState } from "react";

interface ActivityLogsProps {
}

export function ActivityLogsTable({ }: ActivityLogsProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [targetTypeFilter, setTargetTypeFilter] = useState("all");

    const queryClient = useQueryClient();

    const {
        data: auditLogsData,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["audit-logs", currentPage, pageSize, searchQuery, actionFilter, targetTypeFilter],
        queryFn: () =>
            auditApi.getAuditLogs({
                page: currentPage,
                limit: pageSize,
                targetType: targetTypeFilter !== "all" ? targetTypeFilter : undefined,
                action: actionFilter !== "all" ? actionFilter : undefined,
                search: searchQuery || undefined,
            }),
        placeholderData: (previousData) => previousData,
    });

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
    };

    const handleFilterChange = (filter: string, value: string) => {
        if (filter === "action") {
            setActionFilter(value);
        } else if (filter === "targetType") {
            setTargetTypeFilter(value);
        }
        setCurrentPage(1);
    };

    const getActionBadge = (action: string) => {
        const actionLower = action.toLowerCase();

        if (actionLower.includes("created") || actionLower.includes("create")) {
            return (
                <Badge variant="default" className="bg-green-100 text-green-800">
                    {action.replace(/_/g, " ")}
                </Badge>
            );
        } else if (actionLower.includes("updated") || actionLower.includes("update")) {
            return (
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                    {action.replace(/_/g, " ")}
                </Badge>
            );
        } else if (actionLower.includes("deleted") || actionLower.includes("delete")) {
            return <Badge variant="destructive">{action.replace(/_/g, " ")}</Badge>;
        } else if (actionLower.includes("assigned") || actionLower.includes("set")) {
            return (
                <Badge variant="default" className="bg-purple-100 text-purple-800">
                    {action.replace(/_/g, " ")}
                </Badge>
            );
        }

        return <Badge variant="outline">{action.replace(/_/g, " ")}</Badge>;
    };

    const getTargetTypeBadge = (targetType: string) => {
        return (
            <Badge variant="secondary" className="capitalize">
                {targetType}
            </Badge>
        );
    };

    const logs = auditLogsData?.logs || [];
    const totalLogs = auditLogsData?.total || 0;
    const totalPages = auditLogsData?.totalPages || 0;

    if (error) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <p className="text-red-500 mb-2">Failed to load audit logs</p>
                    <Button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["audit-logs"] })}
                        variant="outline"
                        size="sm"
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by performer name, audit ID, or IP address..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Select value={actionFilter} onValueChange={(value) => handleFilterChange("action", value)}>
                        <SelectTrigger className="w-37.5">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            <SelectItem value="user_created">User Created</SelectItem>
                            <SelectItem value="user_updated">User Updated</SelectItem>
                            <SelectItem value="user_deleted">User Deleted</SelectItem>
                            <SelectItem value="role_created">Role Created</SelectItem>
                            <SelectItem value="role_updated">Role Updated</SelectItem>
                            <SelectItem value="role_deleted">Role Deleted</SelectItem>
                            <SelectItem value="admin_created">Admin Created</SelectItem>
                            <SelectItem value="admin_role_assigned">Admin Role Assigned</SelectItem>
                            <SelectItem value="settings_updated">Settings Updated</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={targetTypeFilter} onValueChange={(value) => handleFilterChange("targetType", value)}>
                        <SelectTrigger className="w-37.5">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Target Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="role">Role</SelectItem>
                            <SelectItem value="permission">Permission</SelectItem>
                            <SelectItem value="settings">Settings</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                        <SelectTrigger className="w-25">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10 rows</SelectItem>
                            <SelectItem value="25">25 rows</SelectItem>
                            <SelectItem value="50">50 rows</SelectItem>
                            <SelectItem value="100">100 rows</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Audit ID</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Performer</TableHead>
                            <TableHead>Target Type</TableHead>
                            <TableHead>Timestamp</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12">
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                        <span className="ml-2">Loading audit logs...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                    No audit logs found
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log: AuditLogResponse) => (
                                <TableRow key={log.auditId}>
                                    <TableCell>
                                        <div>
                                            <p className="font-mono text-sm">{log.auditId.substring(0, 12)}...</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getActionBadge(log.action)}</TableCell>
                                    <TableCell className="font-medium">{log.performerName}</TableCell>
                                    <TableCell>{getTargetTypeBadge(log.targetType)}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="text-sm">{format(new Date(log.createdAt), "MMM dd, yyyy")}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(log.createdAt), "HH:mm:ss")}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalLogs)} of{" "}
                        {totalLogs} logs
                    </p>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNum = Math.max(1, currentPage - 2) + i;
                                if (pageNum > totalPages) return null;

                                return (
                                    <Button
                                        key={pageNum}
                                        variant={pageNum === currentPage ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(pageNum)}
                                        className="w-8 h-8 p-0"
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
