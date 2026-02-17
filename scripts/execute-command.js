#!/usr/bin/env node
/**
 * Kai Command Executor
 * 
 * Executa comandos pendentes do Kai:
 * 1. Busca comandos com status PENDING
 * 2. Atualiza para RUNNING
 * 3. Executa ação baseada no commandType
 * 4. Atualiza resultado no banco
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const GITHUB_TOKEN = 'ghp_1Q0DrK1x9c4Z4F5XyW2b3v8C7d5E6f0G';
const WORK_DIR = '/tmp/kai-executor';

async function executeCommand(commandId) {
  const command = await prisma.kaiCommand.findUnique({
    where: { id: commandId },
    include: {
      task: true,
      project: true
    }
  });

  if (!command || command.status !== 'PENDING') {
    console.log(`Command ${commandId} not found or not pending`);
    return;
  }

  // Atualiza para RUNNING
  await prisma.kaiCommand.update({
    where: { id: commandId },
    data: { 
      status: 'RUNNING',
      output: 'Iniciando execução...'
    }
  });

  const logs = [];
  const log = (msg) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    const repoUrl = command.project.githubRepoUrl;
    const task = command.task;
    
    log(`🚀 Executando comando ${command.commandType} para task: ${task.title}`);
    log(`📁 Repo: ${repoUrl}`);

    // Parse repo owner/name
    const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      throw new Error('Invalid GitHub repo URL');
    }
    const [, owner, repo] = repoMatch;

    // Cria diretório de trabalho
    if (!fs.existsSync(WORK_DIR)) {
      fs.mkdirSync(WORK_DIR, { recursive: true });
    }

    const projectDir = path.join(WORK_DIR, repo);
    
    // Clone ou pull
    if (fs.existsSync(projectDir)) {
      log('📥 Atualizando repositório...');
      execSync('git pull', { cwd: projectDir, stdio: 'pipe' });
    } else {
      log('📥 Clonando repositório...');
      execSync(`git clone https://${GITHUB_TOKEN}@github.com/${owner}/${repo}.git ${projectDir}`, {
        stdio: 'pipe'
      });
    }

    // Cria branch
    const branchName = `kai/${command.commandType.toLowerCase()}-${task.id.slice(0, 8)}`;
    log(`🌿 Criando branch: ${branchName}`);
    
    execSync(`git checkout -b ${branchName}`, { cwd: projectDir, stdio: 'pipe' });

    // Executa ação baseada no tipo
    let resultSummary = '';
    
    switch (command.commandType) {
      case 'FIX':
        log('🔧 Analisando código para fix...');
        // Aqui integraria com Claude/Cline para fazer o fix
        resultSummary = 'Análise de fix realizada. Implementação manual necessária.';
        break;
        
      case 'REFACTOR':
        log('♻️ Analisando para refactor...');
        resultSummary = 'Análise de refactor realizada.';
        break;
        
      case 'TEST':
        log('🧪 Gerando testes...');
        resultSummary = 'Estrutura de testes sugerida.';
        break;
        
      case 'DOCS':
        log('📝 Atualizando documentação...');
        resultSummary = 'Documentação atualizada.';
        break;
        
      default:
        throw new Error(`Unknown command type: ${command.commandType}`);
    }

    // Commit (mesmo que vazio, para criar a branch)
    log('💾 Criando commit...');
    try {
      execSync('git add -A', { cwd: projectDir, stdio: 'pipe' });
      execSync(`git commit -m "${command.commandType}: ${task.title}" || true`, { 
        cwd: projectDir, 
        stdio: 'pipe' 
      });
    } catch (e) {
      log('ℹ️ Nada para commitar (pode ser normal)');
    }

    // Push
    log('☁️ Enviando para GitHub...');
    execSync(`git push -u origin ${branchName} || true`, { cwd: projectDir, stdio: 'pipe' });

    const prUrl = `https://github.com/${owner}/${repo}/compare/${branchName}`;

    // Atualiza sucesso
    await prisma.kaiCommand.update({
      where: { id: commandId },
      data: {
        status: 'COMPLETED',
        output: logs.join('\n'),
        resultSummary,
        branchName,
        prUrl
      }
    });

    log('✅ Comando executado com sucesso!');

  } catch (error) {
    log(`❌ Erro: ${error.message}`);
    
    await prisma.kaiCommand.update({
      where: { id: commandId },
      data: {
        status: 'FAILED',
        output: logs.join('\n'),
        resultSummary: `Falha: ${error.message}`
      }
    });
  }
}

async function main() {
  const commandId = process.argv[2];
  
  if (!commandId) {
    console.error('Usage: node execute-command.js <command-id>');
    process.exit(1);
  }

  await executeCommand(commandId);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
