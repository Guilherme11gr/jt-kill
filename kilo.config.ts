// Configuração do Kilo CLI para o projeto Jira Killer
// https://kilo.dev/docs/configuration

import type { KiloConfig } from '@kilocode/cli';

const config: KiloConfig = {
  // Agent Configuration
  agent: {
    name: 'JKILL-AI-Dev',
    systemPrompt: `You are an AI developer working on the Jira Killer project.
  
  ## Project Context
  Jira Killer is a project management system built with:
  - Next.js 16.1.0 + TypeScript
  - Supabase (PostgreSQL + Realtime)
  - Prisma 6.19.2 ORM
  - Tailwind CSS + shadcn/ui
  
  ## Coding Standards
  - Use TypeScript strict mode
  - Follow existing patterns in the codebase
  - Write tests for all new features (vitest)
  - Use proper error handling with custom error classes
  - Follow the repository pattern: domain/use-cases, infra/adapters, lib
  
  ## Quality Gates (REQUIRED)
  After making any changes, you MUST run:
  1. npm run typecheck - Fix all TS errors
  2. npm run lint - Fix all linting issues
  3. npm run build - Verify build succeeds
  
  ## File Organization
  - src/domain/use-cases/ - Business logic
  - src/infra/adapters/ - Data access (Prisma, external APIs)
  - src/lib/ - Shared utilities, hooks
  - src/app/api/ - Next.js API routes
  - src/app/ - Next.js pages
  
  ## Naming Conventions
  - Files: kebab-case (use-task.ts, task-card.tsx)
  - Components: PascalCase (TaskCard, TaskList)
  - Functions: camelCase (getTaskById, createTask)
  - Types: PascalCase (Task, TaskInput, CreateTaskDTO)
  
  ## Database
  - Use Prisma for all database operations
  - Transactions for multi-step operations
  - Always use parameterized queries (no SQL injection)
  
  ## Testing
  - Use vitest for unit tests
  - Test files: *.spec.ts alongside implementation
  - Mock external dependencies
  - Test happy paths AND error cases`,
  },

  // Lifecycle Hooks
  hooks: {
    beforeTask: async (context) => {
      console.log('🚀 Starting task:', context.task);
      console.log('📂 Working in:', context.cwd);
    },
    
    afterEdit: async (context) => {
      console.log('✏️ Edited:', context.filePath);
    },
    
    afterTask: async (context) => {
      console.log('✅ Task completed!');
      
      // Run quality gates
      console.log('🔍 Running quality gates...');
      
      try {
        const { execSync } = require('child_process');
        
        // Typecheck
        console.log('  - typecheck...');
        execSync('npm run typecheck', { cwd: context.cwd, stdio: 'inherit' });
        
        // Lint
        console.log('  - lint...');
        execSync('npm run lint', { cwd: context.cwd, stdio: 'inherit' });
        
        // Build
        console.log('  - build...');
        execSync('npm run build', { cwd: context.cwd, stdio: 'inherit' });
        
        console.log('✅ All quality gates passed!');
      } catch (error) {
        console.error('❌ Quality gates failed:', error);
        throw error;
      }
    }
  },

  // Model Configuration
  model: {
    // Use the model specified in CLI args, fallback to free model
    default: 'kilo/arcee-ai/trinity-large-preview:free',
  },

  // Output Configuration for streaming
  output: {
    format: 'json',  // JSON output for programmatic parsing
    stream: true,     // Enable streaming output
  },

  // Git Integration
  git: {
    autoCommit: false,  // Don't auto-commit, we handle it manually
    createBranch: false, // We handle branch creation
  }
};

export default config;
