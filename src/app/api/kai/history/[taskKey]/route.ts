import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskKey: string }> }
) {
  const { taskKey } = await params;
  
  try {
    const historyPath = path.join('/workspace/main', '.kai-history', `${taskKey}.txt`);
    
    // Ler arquivo de histórico
    const content = await fs.readFile(historyPath, 'utf-8');
    
    // Parsear linhas em eventos
    const events = content
      .split('\n')
      .filter(line => line.trim())
      .map((line, index) => {
        // Tentar parsear JSON
        try {
          return JSON.parse(line);
        } catch {
          // Se não for JSON, criar evento simples
          return {
            id: index,
            type: 'raw',
            data: { message: line },
            timestamp: Date.now(),
          };
        }
      });
    
    return NextResponse.json({ events });
  } catch (error) {
    // Se arquivo não existe, retornar array vazio
    return NextResponse.json({ events: [] });
  }
}
