"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Box, Loader2, MoreVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Feature {
  id: string;
  title: string;
  description: string | null;
  status: string;
  _count?: { tasks: number };
}

interface Epic {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

export default function EpicDetailPage({
  params,
}: {
  params: Promise<{ id: string; epicId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [epic, setEpic] = useState<Epic | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [featureFormData, setFeatureFormData] = useState({
    title: "",
    description: "",
  });

  useEffect(() => {
    fetchEpicData();
  }, [resolvedParams.epicId]);

  const fetchEpicData = async () => {
    try {
      const [epicRes, featuresRes] = await Promise.all([
        fetch(`/api/epics/${resolvedParams.epicId}`),
        fetch(`/api/epics/${resolvedParams.epicId}/features`),
      ]);

      if (epicRes.ok) {
        const data = await epicRes.json();
        setEpic(data.data);
      }
      if (featuresRes.ok) {
        const data = await featuresRes.json();
        setFeatures(data.data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/epics/${resolvedParams.epicId}/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(featureFormData),
      });

      if (res.ok) {
        setFeatureFormData({ title: "", description: "" });
        setIsFeatureDialogOpen(false);
        fetchEpicData();
      } else {
        alert("Erro ao criar feature");
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!epic) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Epic não encontrada</h2>
        <p className="text-muted-foreground mb-4">Não foi possível carregar os dados da epic.</p>
        <Link href={`/projects/${resolvedParams.id}`}>
          <Button variant="outline">Voltar para o Projeto</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link 
          href={`/projects/${resolvedParams.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para Projeto
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline">
                EPIC
              </Badge>
              <Badge variant="secondary">
                {epic.status}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {epic.title}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {epic.description || "Sem descrição"}
            </p>
          </div>
          
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Box className="w-5 h-5 text-primary" />
            Features
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({features.length})
            </span>
          </h2>

          <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Feature
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Feature</DialogTitle>
                <DialogDescription>
                  Features são entregáveis funcionais dentro da Epic
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateFeature} className="space-y-4">
                <div>
                  <Label htmlFor="feature-title">Título</Label>
                  <Input
                    id="feature-title"
                    value={featureFormData.title}
                    onChange={(e) =>
                      setFeatureFormData({ ...featureFormData, title: e.target.value })
                    }
                    placeholder="Ex: Autenticação via Google"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="feature-description">Descrição</Label>
                  <Textarea
                    id="feature-description"
                    value={featureFormData.description}
                    onChange={(e) =>
                      setFeatureFormData({ ...featureFormData, description: e.target.value })
                    }
                    placeholder="Detalhes técnicos da feature..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsFeatureDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                  >
                    Criar Feature
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {features.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Box className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhuma feature ainda</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Quebre sua Epic em features menores e entregáveis para facilitar o desenvolvimento.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setIsFeatureDialogOpen(true)}
            >
              Criar Primeira Feature
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <Card
                key={feature.id}
                className="group hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-[10px]">
                      FEATURE
                    </Badge>
                    <Badge 
                      variant="secondary" 
                    >
                      {feature.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">
                    {feature.title}
                  </CardTitle>
                  {feature.description && (
                    <CardDescription className="line-clamp-2">
                      {feature.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {feature._count?.tasks || 0} tasks
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
