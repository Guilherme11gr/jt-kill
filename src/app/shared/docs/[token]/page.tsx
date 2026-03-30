import { notFound } from 'next/navigation';
import { projectDocRepository } from '@/infra/adapters/prisma';
import { Lock, FileText, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MarkdownViewer } from '@/components/ui/markdown-viewer';

interface PublicDocPageProps {
  params: Promise<{ token: string }>;
}

/**
 * Public Doc Page - Read-only view of shared documentation
 *
 * JKILL-63: This page allows anyone with a valid share token to view
 * a project document without authentication. The doc must be marked
 * as public (isPublic=true) to be accessible.
 */
export default async function PublicDocPage({ params }: PublicDocPageProps) {
  const { token } = await params;

  // Fetch the shared doc
  const doc = await projectDocRepository.findByShareToken(token);

  // Return 404 if doc not found or not public
  if (!doc) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header - non-sticky */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Documentação Pública</h1>
              <p className="text-xs text-muted-foreground">{doc.projectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <Lock className="h-3.5 w-3.5" />
            <span>Apenas leitura</span>
          </div>
        </div>
      </header>

      {/* Doc Header */}
      <div className="container mx-auto px-6 pt-8 pb-4">
        <h2 className="text-2xl font-bold tracking-tight mb-3">{doc.title}</h2>
        {doc.sharedAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Compartilhado {formatDistanceToNow(new Date(doc.sharedAt), { locale: ptBR, addSuffix: true })}
            </span>
          </div>
        )}
      </div>

      {/* Doc Content - full width markdown */}
      <main className="flex-1 container mx-auto px-6 py-10">
        <div className="prose prose-lg dark:prose-invert max-w-none
                    prose-headings:font-semibold prose-headings:text-foreground
                    prose-p:leading-relaxed prose-p:text-muted-foreground
                    prose-strong:text-foreground
                    prose-blockquote:border-l-4 prose-blockquote:border-violet-400
                    prose-blockquote:bg-muted/40 prose-blockquote:py-2 prose-blockquote:px-5
                    prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                    prose-blockquote:text-violet-700 dark:prose-blockquote:text-violet-300
                    prose-code:break-words prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
                    prose-code:rounded prose-code:text-sm prose-code:font-mono
                    prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg
                    prose-pre:overflow-x-auto prose-pre:max-w-full
                    prose-hr:border-border prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-table:w-full prose-th:border prose-th:p-2 prose-th:text-left
                    prose-td:border prose-td:p-2 prose-img:rounded-lg prose-img:shadow-md
                    max-h-none overflow-visible">
          <MarkdownViewer value={doc.content} className="max-h-none overflow-visible text-base" />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-6 text-center text-sm text-muted-foreground">
        <p>
          Compartilhado via <span className="font-mono text-xs bg-muted px-2 py-1 rounded">Fluxo</span>
        </p>
        <p className="text-xs mt-1">
          Este é um link público de leitura. Qualquer pessoa com o link pode visualizar este documento.
        </p>
      </footer>
    </div>
  );
}

/**
 * Generate metadata for the public doc page
 */
export async function generateMetadata({ params }: PublicDocPageProps) {
  const { token } = await params;
  const doc = await projectDocRepository.findByShareToken(token);

  if (!doc) {
    return {
      title: 'Documento não encontrado',
    };
  }

  return {
    title: `${doc.title} - ${doc.projectName}`,
    description: `Documento compartilhado: ${doc.title.substring(0, 160)}...`,
  };
}
