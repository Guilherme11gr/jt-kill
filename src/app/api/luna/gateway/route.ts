import { deprecatedRoute } from '@/shared/http/deprecated-routes';

export async function POST() {
  return deprecatedRoute('Luna gateway');
}
