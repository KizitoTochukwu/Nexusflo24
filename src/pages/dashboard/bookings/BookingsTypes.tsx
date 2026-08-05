import { useState } from "react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useBookingPages } from "@/hooks/useBookings";
import {
  useAppointmentTypes, useCreateAppointmentType, useUpdateAppointmentType,
  useDeleteAppointmentType, type AppointmentType,
} from "@/hooks/useAppointmentTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Layers, Clock, Users2, Pencil, Trash2, Video } from "lucide-react";
import AppointmentTypeForm from "@/components/bookings/AppointmentTypeForm";

const KIND_LABEL: Record<string, string> = {
  one_to_one: "One-to-one",
  group: "Group",
  round_robin: "Round-robin",
  collective: "Collective",
};

export default function BookingsTypes() {
  const workspaceId = useWorkspaceId();
  const { data: types = [], isLoading } = useAppointmentTypes(workspaceId);
  const { data: pages = [] } = useBookingPages(workspaceId);
  const create = useCreateAppointmentType();
  const update = useUpdateAppointmentType();
  const remove = useDeleteAppointmentType();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentType | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AppointmentType | null>(null);

  const handleSubmit = (values: Partial<AppointmentType>) => {
    if (editing) {
      update.mutate({ ...values, id: editing.id }, { onSuccess: () => { setOpen(false); setEditing(null); } });
    } else {
      create.mutate({ ...values, workspace_id: workspaceId, name: values.name! }, { onSuccess: () => setOpen(false) });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Appointment Types</h1>
          <p className="text-sm text-muted-foreground">Define what can be booked, for how long, by whom and with which reminders.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New appointment type
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : types.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <p className="mb-1 font-medium">No appointment types yet</p>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              An appointment type is the meeting itself — a 30 minute discovery call, a group workshop, a round-robin demo.
            </p>
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Create your first type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => (
            <Card key={t.id} className="group rounded-2xl border-border/60 shadow-sm transition hover:shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.name}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{t.description || "No description"}</p>
                  </div>
                  {t.is_published
                    ? <Badge className="shrink-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Live</Badge>
                    : <Badge variant="secondary" className="shrink-0">Draft</Badge>}
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <Chip icon={Clock}>{t.duration_minutes} min</Chip>
                  <Chip icon={Users2}>{KIND_LABEL[t.kind] ?? t.kind}</Chip>
                  {t.kind === "group" && <Chip icon={Users2}>{t.capacity} seats</Chip>}
                  <Chip icon={Video}>{t.location_type.replace(/_/g, " ")}</Chip>
                </div>

                <div className="flex gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(t); setOpen(true); }}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setPendingDelete(t)} aria-label={`Delete ${t.name}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit appointment type" : "New appointment type"}</DialogTitle>
          </DialogHeader>
          <AppointmentTypeForm
            key={editing?.id ?? "new"}
            workspaceId={workspaceId}
            pages={pages}
            initial={editing ?? undefined}
            loading={create.isPending || update.isPending}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this appointment type?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" will no longer be bookable. Existing appointments are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDelete) remove.mutate(pendingDelete.id); setPendingDelete(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Chip({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 capitalize text-muted-foreground">
      <Icon className="h-3 w-3" /> {children}
    </span>
  );
}
