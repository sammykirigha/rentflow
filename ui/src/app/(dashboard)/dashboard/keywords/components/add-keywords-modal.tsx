"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeywordItem, keywordsApi } from "@/lib/api/keywords.api";
import { Crown, FileSpreadsheet, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { KeyboardEvent, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface AddKeywordsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

// Extended KeywordItem with isPrimary for internal tracking
interface ExtendedKeywordItem extends KeywordItem {
	isPrimary: boolean;
}

// Difficulty badge component for preview - shows score with yellow-to-red gradient
const DifficultyBadge = ({ difficulty }: { difficulty?: number; }) => {
	if (difficulty === undefined) return null;

	// Interpolate from yellow (0) to red (100)
	const getGradientColor = (score: number) => {
		const clampedScore = Math.max(0, Math.min(100, score));
		// Yellow: hsl(45, 100%, 51%) -> Red: hsl(0, 100%, 50%)
		const hue = 45 - (clampedScore / 100) * 45; // 45 (yellow) to 0 (red)
		return {
			background: `hsl(${hue}, 100%, 90%)`,
			color: `hsl(${hue}, 100%, 30%)`,
			borderColor: `hsl(${hue}, 100%, 70%)`,
		};
	};

	const colors = getGradientColor(difficulty);

	return (
		<Badge
			variant="outline"
			style={{
				backgroundColor: colors.background,
				color: colors.color,
				borderColor: colors.borderColor,
			}}
		>
			{difficulty}
		</Badge>
	);
};

// Primary/Secondary badge component
const TypeBadge = ({ isPrimary }: { isPrimary: boolean; }) => {
	return isPrimary ? (
		<Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">
			<Crown className="h-3 w-3 mr-1" />
			Primary
		</Badge>
	) : (
		<Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
			Secondary
		</Badge>
	);
};

export default function AddKeywordsModal({
	open,
	onOpenChange,
	onSuccess,
}: AddKeywordsModalProps) {
	const [manualKeywords, setManualKeywords] = useState<ExtendedKeywordItem[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<string>("manual");
	const [fileKeywords, setFileKeywords] = useState<ExtendedKeywordItem[]>([]);
	const [fileName, setFileName] = useState<string>("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleAddKeyword = () => {
		const trimmed = inputValue.trim().toLowerCase();
		if (trimmed && !manualKeywords.some(k => k.keyword === trimmed)) {
			setManualKeywords([...manualKeywords, {
				keyword: trimmed,
				isPrimary: false
			}]);
			setInputValue("");
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleAddKeyword();
		} else if (e.key === "," || e.key === "Tab") {
			e.preventDefault();
			handleAddKeyword();
		}
	};

	const handleRemoveKeyword = (keywordToRemove: string) => {
		setManualKeywords(manualKeywords.filter((k) => k.keyword !== keywordToRemove));
	};

	const handleToggleKeywordType = (keyword: string) => {
		setManualKeywords(manualKeywords.map((k) =>
			k.keyword === keyword ? { ...k, isPrimary: !k.isPrimary } : k
		));
	};

	const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const pastedText = e.clipboardData.getData("text");
		const pastedKeywords = pastedText
			.split(/[,\n\t]+/)
			.map((k) => k.trim().toLowerCase())
			.filter((k) => k && !manualKeywords.some(mk => mk.keyword === k));

		if (pastedKeywords.length > 0) {
			const newKeywords = pastedKeywords.map(k => ({
				keyword: k,
				isPrimary: false
			}));
			setManualKeywords([...manualKeywords, ...newKeywords]);
		}
	};

	const normalizeDifficulty = (value: string | number | undefined): number | undefined => {
		if (value === undefined || value === null || value === "") return undefined;
		const numValue = Number(value);
		if (isNaN(numValue)) return undefined;
		// Clamp between 0 and 100
		return Math.max(0, Math.min(100, Math.round(numValue)));
	};

	const parseFileData = (data: Record<string, unknown>[]): ExtendedKeywordItem[] => {
		const keywords: ExtendedKeywordItem[] = [];

		for (const row of data) {
			// Try to find keyword column (case-insensitive)
			const keywordKey = Object.keys(row).find(
				(k) => k.toLowerCase() === "keyword" || k.toLowerCase() === "keywords"
			);
			const difficultyKey = Object.keys(row).find(
				(k) => k.toLowerCase() === "difficulty" || k.toLowerCase() === "diff" ||
					k.toLowerCase() === "competition" || k.toLowerCase() === "comp"
			);
			const volumeKey = Object.keys(row).find(
				(k) => k.toLowerCase() === "volume" || k.toLowerCase() === "vol" || k.toLowerCase() === "search volume"
			);

			if (keywordKey && row[keywordKey]) {
				const keyword = String(row[keywordKey]).trim().toLowerCase();
				if (keyword) {
					keywords.push({
						keyword,
						difficulty: normalizeDifficulty(row[difficultyKey as string] as string | number),
						volume: volumeKey && row[volumeKey] ? Number(row[volumeKey]) || undefined : undefined,
						isPrimary: false,
					});
				}
			}
		}

		return keywords;
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const allowedTypes = [
			"text/csv",
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		];

		// Check file extension as fallback
		const extension = file.name.split(".").pop()?.toLowerCase();
		const isAllowed = allowedTypes.includes(file.type) || ["csv", "xls", "xlsx"].includes(extension || "");

		if (!isAllowed) {
			toast.error("Please upload a CSV or Excel file (.csv, .xls, .xlsx)");
			return;
		}

		try {
			const arrayBuffer = await file.arrayBuffer();
			const workbook = XLSX.read(arrayBuffer, { type: "array" });
			const firstSheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[firstSheetName];
			const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

			if (jsonData.length === 0) {
				toast.error("The file appears to be empty");
				return;
			}

			const parsedKeywords = parseFileData(jsonData);

			if (parsedKeywords.length === 0) {
				toast.error("No keywords found. Make sure your file has a 'Keyword' column.");
				return;
			}

			setFileKeywords(parsedKeywords);
			setFileName(file.name);
			toast.success(`Found ${parsedKeywords.length} keyword${parsedKeywords.length > 1 ? "s" : ""} in file`);
		} catch (error) {
			console.error("Error parsing file:", error);
			toast.error("Failed to parse file. Please check the format.");
		}

		// Reset file input
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleRemoveFileKeyword = (index: number) => {
		setFileKeywords(fileKeywords.filter((_, i) => i !== index));
	};

	const handleToggleFileKeywordType = (index: number) => {
		setFileKeywords(fileKeywords.map((k, i) =>
			i === index ? { ...k, isPrimary: !k.isPrimary } : k
		));
	};

	const clearFileUpload = () => {
		setFileKeywords([]);
		setFileName("");
	};

	const handleSubmit = async () => {
		const keywordsToSubmit: KeywordItem[] =
			activeTab === "manual"
				? manualKeywords.map((k) => ({ keyword: k.keyword, isPrimary: k.isPrimary }))
				: fileKeywords.map((k) => ({ keyword: k.keyword, difficulty: k.difficulty, volume: k.volume, isPrimary: k.isPrimary }));

		if (keywordsToSubmit.length === 0) {
			toast.error("Please add at least one keyword");
			return;
		}

		try {
			setIsLoading(true);
			await keywordsApi.createKeywords({ keywords: keywordsToSubmit });
			toast.success(
				`${keywordsToSubmit.length} keyword${keywordsToSubmit.length > 1 ? "s" : ""} added successfully`
			);
			// Reset state
			setManualKeywords([]);
			setInputValue("");
			setFileKeywords([]);
			setFileName("");
			onSuccess?.();
			onOpenChange(false);
		} catch (error: unknown) {
			const err = error as { response?: { data?: { message?: string; }; }; };
			toast.error(err.response?.data?.message || "Failed to add keywords");
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		if (!isLoading) {
			setManualKeywords([]);
			setInputValue("");
			setFileKeywords([]);
			setFileName("");
			setActiveTab("manual");
			onOpenChange(false);
		}
	};

	const currentKeywordCount =
		activeTab === "manual" ? manualKeywords.length : fileKeywords.length;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add Keywords</DialogTitle>
					<DialogDescription>
						Enter keywords manually or upload a CSV/Excel file with keyword data.
					</DialogDescription>
				</DialogHeader>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="manual" className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							Manual Entry
						</TabsTrigger>
						<TabsTrigger value="upload" className="flex items-center gap-2">
							<Upload className="h-4 w-4" />
							File Upload
						</TabsTrigger>
					</TabsList>

					{/* Manual Entry Tab */}
					<TabsContent value="manual" className="space-y-4 mt-4">
						<div className="space-y-2">
							<div className="flex gap-2">
								<Input
									id="keyword-input"
									placeholder="Type a keyword and press Enter..."
									value={inputValue}
									onChange={(e) => setInputValue(e.target.value)}
									onKeyDown={handleKeyDown}
									onPaste={handlePaste}
									disabled={isLoading}
								/>
								<Button
									type="button"
									size="icon"
									onClick={handleAddKeyword}
									disabled={!inputValue.trim() || isLoading}
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								Press Enter, Tab, or comma to add. You can also paste multiple
								keywords separated by commas or new lines.
							</p>
						</div>

						{manualKeywords.length > 0 && (
							<div className="space-y-2">
								<Label>Keywords to add ({manualKeywords.length})</Label>
								<div className="border rounded-lg max-h-60 overflow-y-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Keyword</TableHead>
												<TableHead>Type</TableHead>
												<TableHead className="w-10"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{manualKeywords.map((item) => (
												<TableRow key={item.keyword}>
													<TableCell className="font-medium">{item.keyword}</TableCell>
													<TableCell>
														<button
															type="button"
															onClick={() => handleToggleKeywordType(item.keyword)}
															className="cursor-pointer"
															disabled={isLoading}
														>
															<TypeBadge isPrimary={item.isPrimary} />
														</button>
													</TableCell>
													<TableCell>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleRemoveKeyword(item.keyword)}
															disabled={isLoading}
														>
															<Trash2 className="h-3 w-3 text-red-500" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						)}

						<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
							<p className="text-sm text-blue-700">
								<strong>Note:</strong> <strong>Primary</strong> keywords will trigger AI title generation.
								<strong> Secondary</strong> keywords will only be analyzed for difficulty and volume.
								Click on the type badge to toggle between Primary and Secondary.
							</p>
						</div>
					</TabsContent>

					{/* File Upload Tab */}
					<TabsContent value="upload" className="space-y-4 mt-4">
						<div className="space-y-2">
							<Label>Upload File</Label>
							<div
								className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary cursor-pointer transition-colors"
								onClick={() => fileInputRef.current?.click()}
							>
								<input
									ref={fileInputRef}
									type="file"
									accept=".csv,.xls,.xlsx"
									onChange={handleFileUpload}
									className="hidden"
									disabled={isLoading}
								/>
								<FileSpreadsheet className="h-10 w-10 mx-auto text-gray-400 mb-2" />
								<p className="text-sm text-gray-600">
									Click to upload or drag and drop
								</p>
								<p className="text-xs text-gray-400 mt-1">
									CSV, XLS, or XLSX files supported
								</p>
							</div>
							<p className="text-xs text-muted-foreground">
								File should have columns: <strong>Keyword</strong> (required),{" "}
								<strong>Difficulty</strong> (0-100), <strong>Volume</strong> (number),{" "}
								{/* <strong>Type</strong> or <strong>isPrimary</strong> (true/false/primary/secondary) */}
							</p>
						</div>

						{fileName && (
							<div className="flex items-center justify-between p-2 bg-muted rounded-lg">
								<div className="flex items-center gap-2">
									<FileSpreadsheet className="h-4 w-4 text-green-600" />
									<span className="text-sm font-medium">{fileName}</span>
									<Badge variant="secondary">{fileKeywords.length} keywords</Badge>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={clearFileUpload}
									disabled={isLoading}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						)}

						{fileKeywords.length > 0 && (
							<div className="space-y-2">
								<Label>Preview ({fileKeywords.length} keywords)</Label>
								<div className="border rounded-lg max-h-60 overflow-y-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Keyword</TableHead>
												<TableHead>Type</TableHead>
												<TableHead>Difficulty</TableHead>
												<TableHead>Volume</TableHead>
												<TableHead className="w-10"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{fileKeywords.map((item, index) => (
												<TableRow key={index}>
													<TableCell className="font-medium">{item.keyword}</TableCell>
													<TableCell>
														<button
															type="button"
															onClick={() => handleToggleFileKeywordType(index)}
															className="cursor-pointer"
															disabled={isLoading}
														>
															<TypeBadge isPrimary={item.isPrimary} />
														</button>
													</TableCell>
													<TableCell>
														{item.difficulty !== undefined ? (
															<DifficultyBadge difficulty={item.difficulty} />
														) : (
															<span className="text-muted-foreground text-xs">AI will analyze</span>
														)}
													</TableCell>
													<TableCell>
														{item.volume !== undefined ? (
															<span className="font-mono">{item.volume.toLocaleString()}</span>
														) : (
															<span className="text-muted-foreground text-xs">AI will analyze</span>
														)}
													</TableCell>
													<TableCell>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleRemoveFileKeyword(index)}
															disabled={isLoading}
														>
															<Trash2 className="h-3 w-3 text-red-500" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						)}

						{fileKeywords.length === 0 && !fileName && (
							<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
								<p className="text-sm text-amber-700">
									<strong>Tip:</strong> If Difficulty and Volume columns are provided,
									those values will be used directly. Otherwise, AI will analyze each keyword.
									Add a <strong>Type</strong> or <strong>isPrimary</strong> column to control whether keywords are Primary (title generation) or Secondary.
								</p>
							</div>
						)}
					</TabsContent>
				</Tabs>

				<DialogFooter className="mt-4">
					<Button variant="outline" onClick={handleClose} disabled={isLoading}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={currentKeywordCount === 0 || isLoading}
					>
						{isLoading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Adding...
							</>
						) : (
							<>
								<Plus className="h-4 w-4 mr-2" />
								Add{" "}
								{currentKeywordCount > 0
									? `${currentKeywordCount} Keyword${currentKeywordCount > 1 ? "s" : ""}`
									: "Keywords"}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
