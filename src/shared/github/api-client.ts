import { getInstallationToken } from './app-auth';

const GITHUB_API_VERSION = '2022-11-28';

async function getHeaders(installationId: number): Promise<Record<string, string>> {
  const { token } = await getInstallationToken(installationId);
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  };
}

async function githubFetch<T>(url: string, headers: Record<string, string>, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options?.headers || {}) } });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API error (${response.status} ${url}): ${body}`);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

export interface CreateIssueParams {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
}

export interface CreateIssueCommentParams {
  owner: string;
  repo: string;
  issueNumber: number;
  body: string;
}

export interface UpdateIssueParams {
  owner: string;
  repo: string;
  issueNumber: number;
  state?: 'open' | 'closed';
  body?: string;
  title?: string;
}

export interface UpdatePullRequestParams {
  owner: string;
  repo: string;
  pullNumber: number;
  body?: string;
  title?: string;
  state?: 'open' | 'closed';
}

export async function createIssue(installationId: number, params: CreateIssueParams) {
  const headers = await getHeaders(installationId);
  return githubFetch<{ number: number; html_url: string }>(
    `https://api.github.com/repos/${params.owner}/${params.repo}/issues`,
    headers,
    {
      method: 'POST',
      body: JSON.stringify({ title: params.title, body: params.body, labels: params.labels }),
    }
  );
}

export async function createIssueComment(installationId: number, params: CreateIssueCommentParams) {
  const headers = await getHeaders(installationId);
  return githubFetch<{ id: number; html_url: string }>(
    `https://api.github.com/repos/${params.owner}/${params.repo}/issues/${params.issueNumber}/comments`,
    headers,
    {
      method: 'POST',
      body: JSON.stringify({ body: params.body }),
    }
  );
}

export async function updateIssue(installationId: number, params: UpdateIssueParams) {
  const headers = await getHeaders(installationId);
  return githubFetch<{ number: number; html_url: string }>(
    `https://api.github.com/repos/${params.owner}/${params.repo}/issues/${params.issueNumber}`,
    headers,
    {
      method: 'PATCH',
      body: JSON.stringify({ state: params.state, body: params.body, title: params.title }),
    }
  );
}

export async function updatePullRequest(installationId: number, params: UpdatePullRequestParams) {
  const headers = await getHeaders(installationId);
  return githubFetch<{ number: number; html_url: string }>(
    `https://api.github.com/repos/${params.owner}/${params.repo}/pulls/${params.pullNumber}`,
    headers,
    {
      method: 'PATCH',
      body: JSON.stringify({ body: params.body, title: params.title, state: params.state }),
    }
  );
}

export async function getRepository(installationId: number, owner: string, repo: string) {
  const headers = await getHeaders(installationId);
  return githubFetch<{ full_name: string; html_url: string; id: number; default_branch: string }>(
    `https://api.github.com/repos/${owner}/${repo}`,
    headers
  );
}

export interface CreateBranchParams {
  owner: string;
  repo: string;
  branchName: string;
  sha: string;
}

export async function createBranch(installationId: number, params: CreateBranchParams) {
  const headers = await getHeaders(installationId);
  return githubFetch<{ ref: string; object: { sha: string } }>(
    `https://api.github.com/repos/${params.owner}/${params.repo}/git/refs`,
    headers,
    {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${params.branchName}`,
        sha: params.sha,
      }),
    }
  );
}

export async function getRef(installationId: number, owner: string, repo: string, ref: string) {
  const headers = await getHeaders(installationId);
  const encodedRef = ref.replace(/\//g, '%2F');
  return githubFetch<{ ref: string; object: { sha: string; type: string; url: string } }>(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/${encodedRef}`,
    headers
  );
}
