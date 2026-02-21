import { useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  context?: string; // e.g. "all leads" or "all leads in folder X"
};

const DeleteAllDialog = ({ open, onOpenChange, onConfirm, loading, context = "all leads" }: Props) => {
  const [confirmText, setConfirmText] = useState("");

  const handleClose = (v: boolean) => {
    if (!v) setConfirmText("");
    onOpenChange(v);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {context}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete {context} and all associated activities. This action cannot be undone.
            <br /><br />
            Type <strong>DELETE</strong> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE to confirm"
          className="mt-2"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => { onConfirm(); setConfirmText(""); }}
            disabled={confirmText !== "DELETE" || loading}
          >
            {loading ? "Deleting…" : "Delete All"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAllDialog;
