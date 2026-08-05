import { useState } from "react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useBookingPages, useBookings, useCreateBookingPage, useUpdateBookingPage, useDeleteBookingPage,
  type BookingPage,
} from "@/hooks/useBookings";
import { useBookingAutomationStatus } from "@/hooks/useBookingAutomationStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Plus, CalendarDays, Loader2, Trash2 } from "lucide-react";
import BookingPageForm from "@/components/bookings/BookingPageForm";
import BookingPageCard from "@/components/bookings/BookingPageCard";

export default function BookingsPages() {
  const workspaceId = useWorkspaceId();
  const { data: pages = [], isLoading } = useBookingPages(workspaceId);
  const { data: bookings = [] } = useBookings(workspaceId);
  const { data: automationStatus } = useBookingAutomationStatus(workspaceId);
  const createPage = useCreateBookingPage();
  const updatePage = useUpdateBookingPage();
  const deletePage = useDeleteBookingPage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BookingPage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BookingPage | null>(null);

  const baseUrl = window.location.origin;

  const handleCreate = (data: Partial<BookingPage>) =>
    createPage.mutate({ ...data, workspace_id: workspaceId, name: data.name! }, { onSuccess: () => setDialogOpen(false) });

  const handleUpdate = (data: Partial<BookingPage>) => {
    if (!editing) return;
    updatePage.mutate({ ...data, id: editing.id }, { onSuccess: () => { setEditing(null); setDialogOpen(false); } });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Booking Pages</h1>
          <p className="text-sm text-muted-foreground">The public links guests use to schedule with you.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New booking page
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : pages.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <p className="mb-1 font-medium">No booking pages yet</p>
            <p className="mb-4 text-sm text-muted-foreground">Share a link and let guests self-schedule.</p>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Create your first page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <BookingPageCard
              key={page.id}
              page={page}
              bookings={bookings}
              baseUrl={baseUrl}
              automationStatus={automationStatus}
              onEdit={() => { setEditing(page); setDialogOpen(true); }}
              onDelete={() => setPendingDelete(page)}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit booking page" : "Create booking page"}</DialogTitle>
          </DialogHeader>
          <BookingPageForm
            initial={editing || undefined}
            onSubmit={editing ? handleUpdate : handleCreate}
            loading={createPage.isPending || updatePage.isPending}
            publicUrl={editing?.slug ? `${baseUrl}/book/${editing.slug}` : undefined}
            workspaceId={workspaceId}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete booking page?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              {pendingDelete && (
                <>This permanently deletes <span className="font-medium text-foreground">"{pendingDelete.name}"</span> and its public link. Existing appointments remain but new bookings cannot be made.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePage.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && deletePage.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) })}
              disabled={deletePage.isPending}
            >
              {deletePage.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…</>
                : <><Trash2 className="mr-2 h-4 w-4" /> Delete</>}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
