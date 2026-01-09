# 🚀 Deploy Checklist - Multi-Org Production Improvements

## ⚠️ PRÉ-REQUISITOS (CRÍTICO)

- [ ] **BACKUP DO BANCO** antes de qualquer coisa
- [ ] Validar em staging/development primeiro
- [ ] Confirmar que não há deploys simultâneos

---

## 📝 DEPLOY STEPS

### 1. **Staging/Development** (Testar primeiro)

```bash
# 1.1. Deploy do código
git pull origin main
npm install
npm run build

# 1.2. Aplicar migration (APENAS COMENTÁRIO NO BANCO)
npx prisma migrate deploy

# 1.3. Restart da aplicação
pm2 restart app  # ou equivalente
```

### 2. **Testes em Staging**

- [ ] Login/logout funcionando
- [ ] Switch de organização (cookie atualiza)
- [ ] Mudança de role de usuário (invalida cache)
- [ ] Transferência de ownership (invalida ambos)
- [ ] Header `X-Org-Id` funcionando (teste via Postman/curl)

```bash
# Teste com header
curl -H "X-Org-Id: <uuid>" -H "Authorization: Bearer <token>" \
  https://staging.domain.com/api/projects
```

### 3. **Produção** (Só após staging OK)

```bash
# 3.1. BACKUP (obrigatório)
pg_dump -h <host> -U <user> -d <db> > backup_$(date +%Y%m%d_%H%M%S).sql

# 3.2. Deploy do código
git pull origin main
npm install
npm run build

# 3.3. Aplicar migration (só adiciona comentário)
npx prisma migrate deploy

# 3.4. Restart com zero downtime
# (método depende da sua infra)
pm2 reload app --update-env
```

---

## 🔍 MONITORAMENTO PÓS-DEPLOY

### Primeiras 2 horas

- [ ] Logs sem erros críticos
- [ ] Cache funcionando (ver menos queries em `org_memberships`)
- [ ] Usuários conseguem fazer login
- [ ] Switch de org funcionando

### Primeiras 24 horas

- [ ] Performance melhorou (latência de APIs protegidas)
- [ ] Nenhum report de erro de permissão
- [ ] Cache hit rate > 80% (após warm-up)

### Queries úteis

```sql
-- Ver se migration foi aplicada
SELECT * FROM _prisma_migrations 
WHERE migration_name = '20260110_deprecate_userprofile_role';

-- Ver comentário no campo
SELECT col_description('user_profiles'::regclass, 
  (SELECT ordinal_position FROM information_schema.columns 
   WHERE table_name = 'user_profiles' AND column_name = 'role'));

-- Monitorar queries em org_memberships (deve diminuir muito)
SELECT COUNT(*) FROM pg_stat_statements 
WHERE query LIKE '%org_memberships%';
```

---

## 🐛 TROUBLESHOOTING

### Problema: Erros de permissão após deploy

**Causa**: Cache desatualizado após mudança de role  
**Solução**: 
```typescript
// No endpoint que falhou, adicionar:
invalidateMembershipCache(userId);
```

### Problema: Cookie não está secure em produção

**Verificar**: 
```javascript
console.log('NODE_ENV:', process.env.NODE_ENV); // deve ser 'production'
```

**Fix**: Garantir que `NODE_ENV=production` nas env vars

### Problema: Header X-Org-Id não funciona

**Verificar**: Header deve ser lowercase `x-org-id`, não `X-Org-Id`  
**Teste**: 
```bash
curl -v -H "x-org-id: uuid" ...  # ver se aparece no log
```

---

## ⏮️ ROLLBACK (Se necessário)

```bash
# 1. Reverter código
git revert <commit-hash>
npm run build
pm2 restart app

# 2. Reverter migration (se aplicou)
npx prisma migrate resolve --rolled-back 20260110_deprecate_userprofile_role

# 3. Restaurar backup (último recurso)
psql -h <host> -U <user> -d <db> < backup_YYYYMMDD_HHMMSS.sql
```

---

## ✅ CRITÉRIOS DE SUCESSO

- [ ] Zero erros críticos em 24h
- [ ] Latência de APIs protegidas -20% (aprox)
- [ ] Cache hit rate > 80%
- [ ] Nenhum report de bug de permissões
- [ ] Usuários conseguem usar normalmente

---

## 📚 REFERÊNCIAS

- [Documentação completa](../docs/architecture/multi-org-production-improvements.md)
- [Schema Prisma](../prisma/schema.prisma#L39-L48)
- [Auth Helpers](../src/shared/http/auth.helpers.ts)

---

**Última atualização**: 2026-01-10  
**Autor**: GitHub Copilot (Claude Sonnet 4.5)
