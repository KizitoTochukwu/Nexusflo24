import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useBookingPages, useBookings, useCreateBookingPage, useUpdateBookingPage, useDeleteBookingPage, useUpdateBooking } from "@/hooks/useBookings";
import type { BookingPage } from "@/hooks/useBookings";
import { useBookingAutomationStatus } from "@/hooks/useBookingAutomationStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CalendarDays, Loader2, Trash2 } from "lucide-react";
import BookingPageForm from "@/components/bookings/BookingPageForm";
import BookingsSummaryCards from "@/components/bookings/BookingsSummaryCards";
import BookingPageCard from "@/components/bookings/BookingPageCard";
import AppointmentsPanel from "@/components/bookings/AppointmentsPanel";

export default function DashboardBookings() {
  const workspaceId = useWorkspaceId();
  const { data: pages = [], isLoading: pagesLoading } = useBookingPages(workspaceId);
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(workspaceId);
  const { data: automationStatus } = useBookingAutomationStatus(workspaceId);
  const createPage = useCreateBookingPage();
  const updatePage = useUpdateBookingPage();
  const deletePage = useDeleteBookingPage();
  const updateBooking = useUpdateBooking();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BookingPage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BookingPage | null>(null);

  const handleCreate = (data: Partial<BookingPage>) => {
    createPage.mutate({ ...data, workspace_id: workspaceId, name: data.name! }, {
      onSuccess: () => setDialogOpen(false),
    });
  };
  const handleUpdate = (data: Partial<BookingPage>) => {
    if (!editing) return;
    updatePage.mutate({ ...data, id: editing.id }, {
      onSuccess: () => { setEditing(null); setDialogOpen(false); },
    });
  };
  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deletePage.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) });
  };
  const openEdit = (page: BookingPage) => { setEditing(page); setDialogOpen(true); };
  const openCreate = () => { setEditing(null); setDialogOpen(true); };

  const baseUrl = window.location.origin;

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
          <p className="text-sm text-muted-foreground">Create booking pages and manage appointments.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Booking Page</Button>
      </div>

      {!bookingsLoading && bookings.length > 0 && <BookingsSummaryCards bookings={bookings} />}

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Booking Pages</TabsTrigger>
          <TabsTrigger value="bookings">Appointments ({bookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="mt-4">
          {pagesLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : pages.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium mb-1">No booking pages yet</p>
                <p className="text-sm text-muted-foreground mb-4">Share a link and let guests self-schedule.</p>
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Create your first page</Button>
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
                  onEdit={() => openEdit(page)}
                  onDelete={() => setPendingDelete(page)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          {bookingsLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <AppointmentsPanel
              bookings={bookings}
              pages={pages}
              workspaceId={workspaceId}
              onUpdateStatus={(id, status) => updateBooking.mutate({ id, status })}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Booking Page" : "Create Booking Page"}</DialogTitle>
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
                <>This will permanently delete <span className="font-medium text-foreground">"{pendingDelete.name}"</span> and its public link. Existing appointments remain but new bookings cannot be made.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePage.isPending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deletePage.isPending}>
              {deletePage.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…</>)
                : (<><Trash2 className="mr-2 h-4 w-4" /> Delete</>)}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
