import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ModalState {
	authModalOpen: "signin" | "signup" | "forgotPassword" | null;
	setAuthModalOpen: (Modal: "signin" | "signup" | "forgotPassword" | null) => void;
}

export const useModalStore = create<ModalState>()(
	devtools(
		(set) => ({
			authModalOpen: null,
			setAuthModalOpen: (authModalOpen) => set({ authModalOpen }),
		})
	)
);