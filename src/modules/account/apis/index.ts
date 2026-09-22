import { apiClient } from '../../../shared/lib/api-client';
import type { Account, AccountMeResponse } from '../types';

interface PaginatedUsersResponse {
    data: Account[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface GetUsersParams {
    page?: number;
    limit?: number;
    search?: string;
}

export function getMe(): Promise<AccountMeResponse> {
    return apiClient<AccountMeResponse>('/accounts/v2/users/me');
}

export function getAllUsers(
    page = 1,
    limit = 1000,
): Promise<PaginatedUsersResponse> {
    return apiClient<PaginatedUsersResponse>(
        `/accounts/v2/users?page=${page}&limit=${limit}`,
    );
}

export function getPaginatedUsers(
    params: GetUsersParams = {},
): Promise<PaginatedUsersResponse> {
    const { page = 1, limit = 20, search = '' } = params;

    return apiClient<PaginatedUsersResponse>(
        `/accounts/v2/users?page=${page}&limit=${limit}&keyword=${encodeURIComponent(search)}`,
    );
}