import type { MouseEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteTaskModalProps {
  open: boolean;
  task: { id: string; title?: string | null } | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (taskId: string) => void;
}

export function DeleteTaskModal({ open, task, onOpenChange, onDeleted }: DeleteTaskModalProps) {
  const queryClient = useQueryClient();

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.rpc("hard_delete_task", { p_task_id: taskId });

      if (error) {
        throw error;
      }

      return taskId;
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Nie udało się trwale usunąć zadania.");
    },
    onSuccess: (deletedTaskId) => {
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (current: unknown) => {
        if (!Array.isArray(current)) {
          return current;
        }

        return current.filter((item: any) => item?.id !== deletedTaskId);
      });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Zadanie usunięte trwale");
      onDeleted?.(deletedTaskId);
      onOpenChange(false);
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (deleteTaskMutation.isPending) {
      return;
    }

    if (!nextOpen) {
      deleteTaskMutation.reset();
    }

    onOpenChange(nextOpen);
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!task?.id || deleteTaskMutation.isPending) {
      return;
    }

    deleteTaskMutation.mutate(task.id);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Trwałe usunięcie zadania</AlertDialogTitle>
          <AlertDialogDescription>
            Uwaga: Czy na pewno chcesz trwale usunąć to zadanie? Ta akcja jest bezpowrotna. Z bazy
            znikną również wszystkie komentarze, logi oraz dane analityczne powiązane z tym
            zadaniem. Zamiast tego zalecamy użycie archiwizacji.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteTaskMutation.isPending}>Anuluj</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteTaskMutation.isPending || !task?.id}
            onClick={handleDelete}
          >
            {deleteTaskMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Usuwanie...
              </>
            ) : (
              "Tak, usuń trwale"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
