import { deprecatedRoute } from '@/shared/http/deprecated-routes';

export async function GET() {
  return deprecatedRoute('Luna status');
}
