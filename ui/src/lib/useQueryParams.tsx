'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface QueryParamsActions {
  setParam: (key: string, value: string) => void;
  resetFilters: () => void;
  getParam: (key: string) => string | null;
  removeParam: (key: string) => void;
}

export function useQueryParams(): QueryParamsActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper to create a new URL with updated params
  const createQueryString = useCallback(
    (paramsToUpdate: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(paramsToUpdate)) {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      return params.toString();
    },
    [searchParams]
  );

  const setParam = useCallback(
    (key: string, value: string) => {
      const query = createQueryString({ [key]: value });
      router.push(`${pathname}?${query}`);
    },
    [createQueryString, pathname, router]
  );

  const removeParam = useCallback(
    (key: string) => {
      const query = createQueryString({ [key]: null });
      router.push(`${pathname}${query ? `?${query}` : ''}`);
    },
    [createQueryString, pathname, router]
  );

  const getParam = useCallback(
    (key: string) => {
      return searchParams.get(key);
    },
    [searchParams]
  );

  const resetFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  return { setParam, resetFilters, getParam, removeParam };
}