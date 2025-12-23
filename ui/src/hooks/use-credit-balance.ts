'use client';

import { getCreditBalance } from '@/lib/api/billing';
import { CreditBalance } from '@/types/billing';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

interface UseCreditBalanceResult {
	balance: CreditBalance | undefined;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
	hasCredits: (amount?: number) => boolean;
	isLowOnCredits: boolean;
	showInsufficientModal: boolean;
	insufficientData: { required: number; available: number; } | null;
	openInsufficientModal: (required: number) => void;
	closeInsufficientModal: () => void;
}

export function useCreditBalance(): UseCreditBalanceResult {
	const queryClient = useQueryClient();
	const [showInsufficientModal, setShowInsufficientModal] = useState(false);
	const [insufficientData, setInsufficientData] = useState<{
		required: number;
		available: number;
	} | null>(null);

	const {
		data: balance,
		isLoading,
		error,
	} = useQuery<CreditBalance>({
		queryKey: ['creditBalance'],
		queryFn: getCreditBalance,
		staleTime: 30000, // Consider data fresh for 30 seconds
		refetchOnWindowFocus: true,
	});

	const hasCredits = useCallback(
		(amount: number = 1) => {
			if (!balance) return false;
			return balance.available >= amount;
		},
		[balance]
	);

	const isLowOnCredits = balance?.isLowOnCredits ?? false;

	const openInsufficientModal = useCallback(
		(required: number) => {
			setInsufficientData({
				required,
				available: balance?.available ?? 0,
			});
			setShowInsufficientModal(true);
		},
		[balance]
	);

	const closeInsufficientModal = useCallback(() => {
		setShowInsufficientModal(false);
		setInsufficientData(null);
	}, []);

	// Invalidate credit balance when needed
	const invalidateBalance = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['creditBalance'] });
	}, [queryClient]);

	return {
		balance,
		isLoading,
		error: error as Error | null,
		refetch: invalidateBalance,
		hasCredits,
		isLowOnCredits,
		showInsufficientModal,
		insufficientData,
		openInsufficientModal,
		closeInsufficientModal,
	};
}

// Hook to use before performing credit-consuming operations
export function useConsumeCredits() {
	const { balance, hasCredits, openInsufficientModal, refetch } = useCreditBalance();

	const checkCredits = useCallback(
		(requiredCredits: number): boolean => {
			if (!hasCredits(requiredCredits)) {
				openInsufficientModal(requiredCredits);
				return false;
			}
			return true;
		},
		[hasCredits, openInsufficientModal]
	);

	return {
		checkCredits,
		balance,
		refetchBalance: refetch,
	};
}
