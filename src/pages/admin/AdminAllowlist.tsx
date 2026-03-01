import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ShieldCheck, Trash2, Plus, Loader2, Mail } from "lucide-react";
import { format } from "date-fns";

interface AllowlistEntry {
  id: string;
  email: string;
  notes: string | null;
  created_at: string;
}

export default function AdminAllowlist() {
  const qc = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["admin-allowlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_allowlist" as any)
        .select("id, email, notes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as AllowlistEntry[]) || [];
    },
  });

  const addEmail = useMutation({
    mutationFn: async () => {
      const email = newEmail.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address.");
      }
      const { error } = await supabase
        .from("admin_allowlist" as any)
        .insert({ email, notes: newNotes.trim() || null } as any);
      if (error) {
        if (error.message.includes("duplicate")) throw new Error("This email is already in the allowlist.");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-allowlist"] });
      setNewEmail("");
      setNewNotes("");
      toast.success("Email added to admin allowlist.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeEmail = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_allowlist" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-allowlist"] });
      toast.success("Email removed from allowlist. Role will sync on their next login.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="h-6 w-6 text-accent" />
        <h1 className="text-2xl font-bold">Admin Allowlist</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Add Admin Email</CardTitle>
          <CardDescription>Only emails on this list will receive admin privileges on their next sign-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="e.g. CTO"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => addEmail.mutate()} disabled={addEmail.isPending || !newEmail.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-accent" />
            Allowlisted Emails
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !entries?.length ? (
            <p className="text-muted-foreground text-sm py-4">No emails in the allowlist yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Email</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Notes</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Added</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium">{entry.email}</td>
                      <td className="px-3 py-3 text-muted-foreground">{entry.notes || "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {format(new Date(entry.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-3 py-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-3 w-3 mr-1" /> Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove admin access?</AlertDialogTitle>
                              <AlertDialogDescription>
                                <strong>{entry.email}</strong> will lose admin privileges on their next sign-in.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeEmail.mutate(entry.id)}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
