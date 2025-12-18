import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Brain, Target, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            MVP em Desenvolvimento
          </Badge>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Jira Killer
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            Gerenciador de projetos focado em engenharia.
            <br />
            <span className="text-slate-300">Opinionated • Low Friction • AI-First</span>
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="gap-2">
              <Zap className="w-4 h-4" />
              Começar Agora
            </Button>
            <Button size="lg" variant="outline">
              Ver Documentação
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <Brain className="w-10 h-10 text-purple-500 mb-2" />
              <CardTitle>AI Scribe</CardTitle>
              <CardDescription>
                Transforma anotações desestruturadas em tasks técnicas estruturadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Escreva como pensa, a IA estrutura pra você. Staging area para revisão antes de salvar.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <Target className="w-10 h-10 text-blue-500 mb-2" />
              <CardTitle>Workflow Rígido</CardTitle>
              <CardDescription>
                BACKLOG → TODO → DOING → REVIEW → QA_READY → DONE
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Zero configuração. Funciona out-of-the-box com fluxo validado e otimizado.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <Users className="w-10 h-10 text-green-500 mb-2" />
              <CardTitle>Scrum Poker</CardTitle>
              <CardDescription>
                Estimativa in-place sem sair do contexto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Votação realtime dentro do modal da task. Votos ocultos até revelar.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status */}
        <div className="text-center mt-16">
          <p className="text-slate-500 text-sm">
            Stack: Next.js 15 • TypeScript • Supabase • Tailwind CSS • Shadcn/UI
          </p>
        </div>
      </main>
    </div>
  );
}
