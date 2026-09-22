import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { accountApis } from '../apis';

export function useAllUsers(page = 1, limit = 1000, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['accounts', 'users', page, limit],
        queryFn: () => accountApis.getAllUsers(page, limit),
        staleTime: 5 * 60 * 1000,
        ...options,
    });
}

export function useInfiniteUsers(params?: { search?: string }, options?: { enabled?: boolean }) {
    return useInfiniteQuery({
        queryKey: ['accounts', 'users', 'infinite', params?.search],
        queryFn: ({ pageParam = 1 }) => accountApis.getPaginatedUsers({ page: pageParam as number, limit: 20, search: params?.search }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const totalPages = lastPage.meta?.totalPages || lastPage.meta?.total_pages;
            if (totalPages && allPages.length < totalPages) {
                return allPages.length + 1;
            }
            if (lastPage.data.length === 20) return allPages.length + 1;
            return undefined;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
}
