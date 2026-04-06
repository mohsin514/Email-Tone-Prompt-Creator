export interface QueueJobCounts {
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  paused?: number;
}

export interface AdminStats {
  queue: {
    emailFetch: QueueJobCounts;
    toneAnalysis: QueueJobCounts;
  };
  counts: {
    users: number;
    emails: number;
    activePrompts: number;
  };
  jobs: Record<string, number>;
  recentJobs: RecentJob[];
}

export interface RecentJob {
  id: string;
  userId: string;
  type: string;
  status: string;
  context: string | null;
  createdAt: string;
  completedAt: string | null;
  user: { email: string; name: string | null };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  provider: string;
  createdAt: string;
  _count: {
    emails: number;
    tonePrompts: number;
    processingJobs: number;
  };
  latestQualityScore: number | null;
  lastPromptDate: string | null;
}

export interface PaginatedUsers {
  data: AdminUserRow[];
  pagination: Pagination;
}

export interface ProcessingJobRow {
  id: string;
  userId: string;
  type: string;
  status: string;
  context: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  user: { email: string; name: string | null };
  _count: { tonePrompts: number };
}

export interface PaginatedJobs {
  data: ProcessingJobRow[];
  pagination: Pagination;
}

export interface UserDetailResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    provider: string;
    createdAt: string;
    updatedAt: string;
    _count: { emails: number; tonePrompts: number; processingJobs: number };
  };
  activePrompts: Array<{
    id: string;
    context: string;
    version: number;
    toneText: string;
    qualityScore: number;
    emailCount: number;
    status: string;
    createdAt: string;
  }>;
  recentJobs: Array<{
    id: string;
    type: string;
    status: string;
    context: string | null;
    createdAt: string;
    completedAt: string | null;
  }>;
  emailsByContext: Array<{ context: string; count: number }>;
}
