import type { AxiosInstance } from 'axios';
import type {
  AdminStats,
  PaginatedJobs,
  PaginatedUsers,
  UserDetailResponse,
} from '../types/admin';

export async function fetchStats(client: AxiosInstance): Promise<AdminStats> {
  const { data } = await client.get<AdminStats>('/admin/stats');
  return data;
}

export async function fetchUsers(
  client: AxiosInstance,
  page: number,
  limit = 20
): Promise<PaginatedUsers> {
  const { data } = await client.get<PaginatedUsers>('/admin/users', {
    params: { page, limit },
  });
  return data;
}

export async function fetchJobs(
  client: AxiosInstance,
  page: number,
  limit = 15
): Promise<PaginatedJobs> {
  const { data } = await client.get<PaginatedJobs>('/jobs', {
    params: { page, limit },
  });
  return data;
}

export async function fetchUserDetail(
  client: AxiosInstance,
  userId: string
): Promise<UserDetailResponse> {
  const { data } = await client.get<UserDetailResponse>(`/admin/users/${userId}`);
  return data;
}

export async function postRegenerate(
  client: AxiosInstance,
  userId: string,
  context?: string
): Promise<{ jobId: string; status: string }> {
  const { data } = await client.post(`/admin/users/${userId}/regenerate`, {
    context: context || undefined,
  });
  return data;
}

export async function postFetchEmails(
  client: AxiosInstance,
  userId: string
): Promise<{ jobId: string; status: string }> {
  const { data } = await client.post(`/admin/users/${userId}/fetch-emails`);
  return data;
}
