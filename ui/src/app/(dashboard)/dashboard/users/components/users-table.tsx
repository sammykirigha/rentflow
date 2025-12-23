/* eslint-disable @typescript-eslint/no-empty-object-type */
"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { userApi } from "@/lib/api/user.api";
import { User } from "@/types/users.d";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	ChevronLeft,
	ChevronRight,
	Filter,
	MoreHorizontal,
	Search,
	UserCheck,
	UserX
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

interface UsersTableProps {
	// Add props if needed in the future
}

export function UsersTable({ }: UsersTableProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [roleFilter, setRoleFilter] = useState("all");
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
	const [deactivationReason, setDeactivationReason] = useState("");

	const queryClient = useQueryClient();

	// Fetch users with filters and pagination
	const {
		data: usersData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["users", currentPage, pageSize, searchQuery, statusFilter, roleFilter],
		queryFn: () =>
			userApi.getUsers({
				page: currentPage,
				limit: pageSize,
				search: searchQuery || undefined,
				status: statusFilter !== "all" ? statusFilter : undefined,
				role: roleFilter !== "all" ? roleFilter : undefined,
			}),
		placeholderData: (previousData) => previousData,
	});

	// Update user status mutation
	const updateUserStatusMutation = useMutation({
		mutationFn: ({ userId, status, reason }: { userId: string; status: string; reason?: string; }) =>
			userApi.updateUserStatus(userId, { status, reason }),
		onSuccess: (updatedUser) => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
			toast.success(
				`User ${updatedUser.firstName} ${updatedUser.lastName} has been ${updatedUser.status === "suspended" ? "deactivated" : "activated"
				} successfully`
			);
			setIsDeactivateDialogOpen(false);
			setSelectedUser(null);
			setDeactivationReason("");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Failed to update user status");
		},
	});

	const handleUserAction = (user: User, action: string) => {
		setSelectedUser(user);

		switch (action) {
			case "deactivate":
				if (user.status?.toLowerCase() === "active") {
					setIsDeactivateDialogOpen(true);
				}
				break;
			case "activate":
				// if (user.status?.toLowerCase() === "suspended") {
				updateUserStatusMutation.mutate({
					userId: user.userId,
					status: "ACTIVE",
				});
				// }
				break;
			case "view":
				// TODO: Implement user detail view
				toast.info("User detail view coming soon");
				break;
			default:
				break;
		}
	};

	const handleConfirmDeactivation = () => {
		if (selectedUser && deactivationReason.trim()) {
			updateUserStatusMutation.mutate({
				userId: selectedUser.userId,
				status: "INACTIVE",
				reason: deactivationReason,
			});
		}
	};

	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		setCurrentPage(1); // Reset to first page when searching
	};

	const handleFilterChange = (filter: string, value: string) => {
		if (filter === "status") {
			setStatusFilter(value);
		} else if (filter === "role") {
			setRoleFilter(value);
		}
		setCurrentPage(1); // Reset to first page when filtering
	};

	const getStatusBadge = (status: string) => {
		switch (status.toLowerCase()) {
			case "active":
				return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
			case "suspended":
				return <Badge variant="destructive">Suspended</Badge>;
			case "inactive":
				return <Badge variant="destructive">Inactive</Badge>;
			case "pending":
				return <Badge variant="secondary">Pending</Badge>;
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	const getRoleBadge = (role: string, isAdmin: boolean) => {
		if (isAdmin) {
			return <Badge variant="default" className="bg-purple-100 text-purple-800">Admin</Badge>;
		}
		return <Badge variant="outline">{role || "User"}</Badge>;
	};

	// Filter out admin users - only show non-admin users
	const filteredUsers = usersData?.data?.filter((user: User) => !user.isAdminUser) || [];
	const totalUsers = usersData?.pagination?.total || 0;
	const totalPages = Math.ceil(totalUsers / pageSize);

	if (error) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center">
					<p className="text-red-500 mb-2">Failed to load users</p>
					<Button
						onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
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
		<>
			<div className="space-y-4">
				{/* Filters and Search */}
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="flex-1">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search by name or email..."
								value={searchQuery}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>

					<div className="flex gap-2">
						<Select value={statusFilter} onValueChange={(value) => handleFilterChange("status", value)}>
							<SelectTrigger className="w-[130px]">
								<Filter className="h-4 w-4 mr-2" />
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="suspended">Suspended</SelectItem>
								<SelectItem value="pending">Pending</SelectItem>
							</SelectContent>
						</Select>

						<Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
							<SelectTrigger className="w-[100px]">
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

				{/* Table */}
				<div className="border rounded-lg overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Joined Date</TableHead>
								<TableHead>Last Login</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={7} className="text-center py-12">
										<div className="flex items-center justify-center">
											<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
											<span className="ml-2">Loading users...</span>
										</div>
									</TableCell>
								</TableRow>
							) : filteredUsers.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
										No users found
									</TableCell>
								</TableRow>
							) : (
								filteredUsers.map((user: User) => (
									<TableRow key={user.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
													{user.avatarUrl ? (
														<Image
															src={user.avatarUrl}
															alt={`${user.firstName} ${user.lastName}`}
															width={32}
															height={32}
															className="h-8 w-8 rounded-full object-cover"
														/>
													) : (
														<span className="text-sm font-medium">
															{user.firstName[0]}{user.lastName[0]}
														</span>
													)}
												</div>
												<div>
													<p className="font-medium">
														{user.firstName} {user.lastName}
													</p>
													<p className="text-sm text-muted-foreground">
														ID: {user.userId?.substring(0, 8)}...
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div>
												<p>{user.email}</p>
												{!user.emailVerified && (
													<p className="text-xs text-amber-600">Not verified</p>
												)}
											</div>
										</TableCell>
										<TableCell>
											{getRoleBadge(user.role, user.isAdminUser)}
										</TableCell>
										<TableCell>
											{getStatusBadge(user.status)}
										</TableCell>
										<TableCell>
											<span className="text-sm">
												{format(new Date(user.createdAt), "MMM dd, yyyy")}
											</span>
										</TableCell>
										<TableCell>
											<span className="text-sm text-muted-foreground">
												{user.lastLoginAt
													? format(new Date(user.lastLoginAt), "MMM dd, yyyy")
													: "Never"
												}
											</span>
										</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" className="h-8 w-8 p-0">
														<span className="sr-only">Open menu</span>
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													{/* <DropdownMenuItem onClick={() => handleUserAction(user, "view")}>
														<Eye className="h-4 w-4 mr-2" />
														View Details
													</DropdownMenuItem> */}
													{/* <DropdownMenuSeparator /> */}
													{user.status.toLowerCase() === "active" ? (
														<DropdownMenuItem
															onClick={() => handleUserAction(user, "deactivate")}
															className="text-red-600"
														>
															<UserX className="h-4 w-4 mr-2" />
															Deactivate User
														</DropdownMenuItem>
													) : (
														<DropdownMenuItem
															onClick={() => handleUserAction(user, "activate")}
															className="text-green-600"
														>
															<UserCheck className="h-4 w-4 mr-2" />
															Activate User
														</DropdownMenuItem>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
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
							Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
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

			{/* Deactivate User Dialog */}
			<AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate User</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to deactivate {selectedUser?.firstName} {selectedUser?.lastName}?
							This will prevent them from accessing the platform.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<div className="py-4">
						<label htmlFor="reason" className="text-sm font-medium">
							Reason for deactivation (required)
						</label>
						<Input
							id="reason"
							value={deactivationReason}
							onChange={(e) => setDeactivationReason(e.target.value)}
							placeholder="Enter reason for deactivation..."
							className="mt-1"
						/>
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDeactivation}
							disabled={!deactivationReason.trim() || updateUserStatusMutation.isPending}
							className="bg-red-600 hover:bg-red-700"
						>
							{updateUserStatusMutation.isPending ? "Deactivating..." : "Deactivate User"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}