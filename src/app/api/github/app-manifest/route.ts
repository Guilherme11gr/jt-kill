import { NextResponse } from 'next/server';

const GITHUB_APP_ID = process.env.GITHUB_APP_ID || '';
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';

export async function GET() {
  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
    return NextResponse.json(
      { error: 'GitHub App not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY env vars.' },
      { status: 503 }
    );
  }

  const manifest = {
    name: 'FluXo',
    url: APP_URL,
    hook_attributes: {
      url: `${APP_URL}/api/github/webhooks`,
    },
    redirect_url: `${APP_URL}/api/github/install/callback`,
    setup_url: `${APP_URL}/api/github/install/callback`,
    description: 'FluXo – Task manager for solo builders. Links tasks to GitHub issues & PRs.',
    public: false,
    default_events: ['push', 'pull_request', 'installation', 'installation_repositories'],
    default_permissions: {
      issues: 'write',
      pull_requests: 'write',
      repository_metadata: 'read',
      contents: 'read',
    },
  };

  return NextResponse.json(manifest);
}
