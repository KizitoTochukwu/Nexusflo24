import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useBookingPages, useBookings, useCreateBookingPage, useUpdateBookingPage, useDeleteBookingPage, useUpdateBooking } from "@/hooks/useBookings";
import type { BookingPage } from "@/hooks/useBookings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ExternalLink, Pencil, Trash2, CalendarDays, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BookingPageForm from "@/components/bookings/BookingPageForm";
import BookingsList from "@/components/bookings/BookingsList";

export default function DashboardBookings() {
  const workspaceId = useWorkspaceId();
  const { data: pages = [], isLoading: pagesLoading } = useBookingPages(workspaceId);
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(workspaceId);
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
    deletePage.mutate(pendingDelete.id, {
      onSettled: () => setPendingDelete(null),
    });
  };

  const openEdit = (page: BookingPage) => {
    setEditing(page);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const baseUrl = window.location.origin;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
          <p className="text-sm text-muted-foreground">Create booking pages and manage appointments.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Booking Page</Button>
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Booking Pages</TabsTrigger>
          <TabsTrigger value="bookings">Appointments ({bookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="mt-4">
          {pagesLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : pages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarDays className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground mb-3">No booking pages yet.</p>
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Create Your First</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pages.map((page) => {
                const pageBookings = bookings.filter((b) => b.booking_page_id === page.id && b.status === "confirmed");
                return (
                  <Card key={page.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{page.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{page.duration_minutes} min • {page.timezone}</p>
                        </div>
                        <Badge variant={page.status === "active" ? "default" : "secondary"}>{page.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {page.description && <p className="text-sm text-muted-foreground line-clamp-2">{page.description}</p>}
                      <p className="text-xs text-muted-foreground">{pageBookings.length} upcoming booking{pageBookings.length !== 1 ? "s" : ""}</p>
                      <div className="flex items-center gap-2">
                        {page.slug && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`${baseUrl}/book/${page.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-1 h-3 w-3" /> Preview
                            </a>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEdit(page)}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => setPendingDelete(page)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          {bookingsLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <BookingsList
                  bookings={bookings}
                  bookingPages={pages}
                  onCancel={(id) => updateBooking.mutate({ id, status: "cancelled" })}
                />
              </CardContent>
            </Card>
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
              <div className="flex-1">
                <AlertDialogTitle>Delete booking page?</AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="pt-2">
              {pendingDelete ? (
                <>
                  This will permanently delete <span className="font-medium text-foreground">"{pendingDelete.name}"</span> and its public booking link.
                  Existing appointments will remain, but no new bookings can be made. This action cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePage.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletePage.isPending}
            >
              {deletePage.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…</>
              ) : (
                <><Trash2 className="mr-2 h-4 w-4" /> Delete booking page</>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
