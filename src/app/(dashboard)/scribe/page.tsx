import { Card } from "@/components/ui/card";

export default function ScribePage() {
  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Scribe</h1>
        <p className="text-muted-foreground">Gere texto e documentação com ajuda de IA</p>
      </div>

      <Card className="p-12 text-center">
        <h2 className="text-lg font-semibold mb-2">Em breve</h2>
        <p className="text-muted-foreground">Essa tela ainda está em construção.</p>
      </Card>
    </div>
  );
}
