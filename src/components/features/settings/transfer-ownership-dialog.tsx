"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface TeamMember {
  id: string;
  displayName: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TeamMember[];
  currentUserId: string;
  onSuccess?: () => void;
}

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  members,
  currentUserId,
  onSuccess,
}: TransferOwnershipDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Filter out current user and only show other members
  const eligibleMembers = members.filter(m => m.id !== currentUserId);

  const handleTransfer = async () => {
    if (!selectedUserId) {
      toast.error("Selecione um membro");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/users/transfer-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId: selectedUserId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error?.message || "Erro ao transferir propriedade");
        return;
      }

      toast.success("Propriedade transferida com sucesso!");
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error("Erro ao transferir propriedade");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Propriedade</DialogTitle>
          <DialogDescription>
            Selecione o membro que se tornará o novo proprietário da organização.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-destructive/10 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Atenção!</p>
              <p className="text-muted-foreground">
                Você perderá os privilégios de proprietário e se tornará um administrador.
                Esta ação não pode ser desfeita por você.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Novo Proprietário</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um membro" />
              </SelectTrigger>
              <SelectContent>
                {eligibleMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.displayName || 'Usuário'} ({member.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={loading || !selectedUserId}
            variant="destructive"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
