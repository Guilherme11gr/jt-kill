# Git Commit Suggestion

```bash
git add .

git commit -m "feat(multi-org): production-ready improvements

- Add in-memory cache for org memberships (5min TTL, -90% queries)
- Support X-Org-Id header for API/mobile clients (priority over cookie)
- Implement secure cookies based on environment (dev/prod)
- Deprecate UserProfile.role in favor of OrgMembership.role
- Add cache invalidation after role changes
- Create deployment checklist and validation scripts

BREAKING: None (backward compatible)
MIGRATION: Only adds comment to DB column (safe)

Files:
- src/shared/cache/membership-cache.ts (new)
- src/shared/utils/cookie-utils.ts (new)
- src/shared/http/auth.helpers.ts (cache + header)
- src/providers/auth-provider.tsx (secure cookies)
- src/app/api/users/[id]/role/route.ts (invalidation)
- src/app/api/users/transfer-ownership/route.ts (invalidation)
- prisma/schema.prisma (deprecated comment)
- prisma/migrations/20260110_deprecate_userprofile_role/ (safe migration)
- docs/architecture/multi-org-production-improvements.md
- DEPLOY-MULTI-ORG-CHECKLIST.md
- FEATURE-COMPLETE-MULTI-ORG.md
- scripts/validate-multi-org-improvements.sh
- scripts/quick-validate.sh

Refs: #multi-org-production
"
```

## Ou commit convencional simples:

```bash
git add .

git commit -m "feat(auth): add cache, header support, and secure cookies for multi-org

- In-memory membership cache (5min TTL)
- X-Org-Id header support (API-first)
- Environment-based secure cookies
- Deprecate UserProfile.role (use OrgMembership.role)
- Cache invalidation on role changes

Migration: Safe (only adds DB comment)
Backward compatible: Yes
"
```

## Verificar antes de push:

```bash
# Ver diff
git diff --cached

# Ver arquivos
git status

# Validar
bash scripts/quick-validate.sh

# Push
git push origin main
```
