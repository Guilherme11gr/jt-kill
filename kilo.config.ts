import { defineKiloConfig } from '@kilocode/cli/config';

export default defineKiloConfig({
  // ===== SYSTEM PROMPT =====
  instructions: `
You are an expert TypeScript/Next.js developer working on the FluXo project.

## Project Context
- **Framework**: Next.js 16.1.0 with TypeScript
- **Database**: Supabase (PostgreSQL + Realtime)
- **ORM**: Prisma 6.19.2
- **Styling**: Tailwind CSS with shadcn/ui
- **State Management**: TanStack Query + Zustand

## Coding Standards
1. **Type Safety**: Always use TypeScript, avoid 'any', prefer explicit types
2. **Component Architecture**: Server Components by default, Client Components only when needed
3. **Error Handling**: Always handle errors gracefully with try/catch
4. **Performance**: Use React.memo, useMemo, useCallback appropriately
5. **Accessibility**: Use semantic HTML, ARIA labels, keyboard navigation

## Git Rules
- Commit messages MUST follow: \`type(scope): description\`
- Types: feat, fix, refactor, chore, docs, test
- Never commit directly to main
- Always create feature branches

## Security Rules
- NEVER expose secrets or API keys
- Always validate user input
- Use Supabase RLS for row-level security
- Never trust client-side data without validation

## File Organization
- Server Components: \`src/app/**/page.tsx\`
- Client Components: \`src/components/**/index.tsx\`
- Utilities: \`src/shared/utils/**.ts\`
- Types: \`src/shared/types/**.ts\`
- API Routes: \`src/app/api/**/route.ts\`
`,

  // ===== AGENT CONFIGURATION =====
  agent: 'build', // 'build' (full access) or 'plan' (read-only)

  // ===== MCP SERVERS =====
  mcp: {
    enabled: true,
    servers: [
      {
        name: 'jt-kill',
        description: 'Jira Killer database MCP',
        tools: ['tasks', 'projects', 'features', 'epics', 'docs']
      },
      {
        name: 'github-mcp',
        description: 'GitHub integration for commits and PRs',
        tools: ['create_pr', 'list_prs', 'get_file']
      }
    ]
  },

  // ===== QUALITY GATES =====
  qualityGates: {
    enabled: true,
    checks: [
      {
        name: 'typecheck',
        command: 'npm run typecheck',
        required: true,
        continueOnError: false
      },
      {
        name: 'lint',
        command: 'npm run lint',
        required: false, // Allow linting warnings
        continueOnError: true
      },
      {
        name: 'build',
        command: 'npm run build',
        required: true,
        continueOnError: false
      },
      {
        name: 'test',
        command: 'npm run test',
        required: false,
        continueOnError: true
      }
    ]
  },

  // ===== LIFECYCLE HOOKS =====
  hooks: {
    beforeTask: async (context) => {
      console.log('🔧 Starting task...');
      console.log('📋 Task:', context.prompt);
      console.log('🌿 Current branch:', await context.git.currentBranch());
    },

    afterEdit: async (context) => {
      console.log('✅ File edited:', context.file);
      // Auto-format after edits
      if (context.file.endsWith('.ts') || context.file.endsWith('.tsx')) {
        console.log('🎨 Auto-formatting...');
        await context.exec('npx prettier --write ' + context.file);
      }
    },

    afterTask: async (context) => {
      console.log('✨ Task completed!');
      console.log('📊 Summary:', context.summary);

      // Check for TypeScript errors
      const typecheck = await context.exec('npm run typecheck', { silent: true });
      if (!typecheck.success) {
        console.log('❌ Type errors detected!');
        console.log(typecheck.stderr);
      }
    }
  },

  // ===== GIT INTEGRATION =====
  git: {
    enabled: false, // Let Kai Delegator handle git
    autoCommit: false,
    createBranch: false
  },

  // ===== SECURITY =====
  security: {
    blockDangerousCommands: true,
    dangerousPatterns: [
      'rm -rf',
      'dd if=',
      '> /dev/sd',
      ':(){ :|:& };:',
      'eval(',
      'exec(',
      'sudo rm'
    ],
    allowedPaths: [
      '/workspace/repos',
      '/workspace/main',
      '/tmp'
    ]
  },

  // ===== PERFORMANCE =====
  performance: {
    maxMemory: '4GB',
    timeout: 600, // 10 minutes max
    cacheDirectory: '.kilo-cache'
  },

  // ===== LOGGING =====
  logging: {
    level: 'INFO',
    verbose: true,
    saveTo: '.kilo-history/task-{taskId}.txt'
  }
});
