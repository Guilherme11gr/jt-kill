import { createSign } from 'crypto';

const GITHUB_APP_ID = process.env.GITHUB_APP_ID || '';
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY || '';
const JWT_EXPIRY_SECONDS = 600;
const JWT_ISSUER_SKEW_SECONDS = 60;

interface InstallationTokenResult {
  token: string;
  expiresAt: string;
}

function base64urlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateAppJwt(): string {
  const now = Math.floor(Date.now() / 1000);

  const header = base64urlEncode(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64urlEncode(
    Buffer.from(
      JSON.stringify({
        iat: now - JWT_ISSUER_SKEW_SECONDS,
        exp: now + JWT_EXPIRY_SECONDS,
        iss: GITHUB_APP_ID,
      })
    )
  );

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(GITHUB_APP_PRIVATE_KEY);

  return `${header}.${payload}.${base64urlEncode(signature)}`;
}

export async function getInstallationToken(installationId: number): Promise<InstallationTokenResult> {
  const jwt = generateAppJwt();

  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to get installation token (${response.status}): ${body}`);
  }

  const data = await response.json();
  return {
    token: data.token,
    expiresAt: data.expires_at,
  };
}

export { generateAppJwt };
