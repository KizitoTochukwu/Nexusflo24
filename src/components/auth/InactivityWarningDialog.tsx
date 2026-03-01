import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface Props {
  open: boolean;
  onStay: () => void;
  onLogout: () => void;
}

const InactivityWarningDialog = ({ open, onStay, onLogout }: Props) => (
  <AlertDialog open={open}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-accent" />
          Session Timeout Warning
        </AlertDialogTitle>
        <AlertDialogDescription>
          You'll be logged out in 5 minutes due to inactivity. Would you like to stay logged in?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onLogout}>Log out now</AlertDialogCancel>
        <AlertDialogAction onClick={onStay} className="bg-accent text-accent-foreground hover:bg-accent/90">
          Stay logged in
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default InactivityWarningDialog;
