'use client';

import { useAuth } from '@/contexts/AuthContext';
import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface OrgInfo {
	organizationId: string;
	name?: string;
	logoUrl?: string;
	primaryColor?: string;
}

interface OrgContextType {
	organization: OrgInfo | null;
	isSuperAdmin: boolean;
	loading: boolean;
}

const OrgContext = createContext<OrgContextType>({
	organization: null,
	isSuperAdmin: false,
	loading: true,
});

export function OrgProvider({ children }: { children: React.ReactNode }) {
	const { data: session } = useSession();
	const { user } = useAuth();
	const [organization, setOrganization] = useState<OrgInfo | null>(null);
	const [loading, setLoading] = useState(true);

	const isSuperAdmin = session?.user?.isSuperAdmin || false;

	useEffect(() => {
		if (session?.user?.organizationId) {
			setOrganization({
				organizationId: session.user.organizationId,
			});
		}
		setLoading(false);
	}, [session]);

	return (
		<OrgContext.Provider value={{ organization, isSuperAdmin, loading }}>
			{children}
		</OrgContext.Provider>
	);
}

export function useOrg() {
	return useContext(OrgContext);
}
