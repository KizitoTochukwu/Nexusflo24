import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarPlus, CheckSquare, Mail, MessageCircle, MessageSquare, PhoneCall, Workflow } from "lucide-react";
import type { Contact } from "@/hooks/useContacts";
import { logCrmActivity } from "@/lib/crm/events";
import { useAuth } from "@/contexts/AuthContext";
import { useEmailStatus } from "@/hooks/useEmailStatus";
import { useSmsStatus } from "@/hooks/useSmsStatus";
import { useActiveWhatsAppProvider } from "@/hooks/useWhatsAppConnection";
import { useAutomations } from "@/hooks/useAutomations";
import { useCreateLeadTask } from "@/hooks/useLeadTasks";
import { useQueryClient } from "@tanstack/react-query";

type Channel = "email" | "sms" | "whatsapp" | "call" | "task" | "automation" | null;

const ContactQuickActions = ({ contact, workspaceId }: { contact: Contact; workspaceId: string }) => {
  const [open, setOpen] = useState<Channel>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [automationId, setAutomationId] = useState("");
  const [busy, setBusy] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const emailStatus = useEmailStatus(workspaceId);
  const smsStatus = useSmsStatus(workspaceId);
  const { data: waProvider } = useActiveWhatsAppProvider(workspaceId);
  const { data: automations = [] } = useAutomations(workspaceId);
  const createTask = useCreateLeadTask();

  const emailReady = Boolean((emailStatus as any)?.data?.configured);
  const smsReady = Boolean((smsStatus as any)?.data?.configured);

  const waReady = !!waProvider;
  const optedOut = contact.consent_status === "opted_out";
  const activeAutomations = (automations as any[]).filter((a) => a.status === "active");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["crm-activities", "contact", contact.id] });
    qc.invalidateQueries({ queryKey: ["crm-contact", contact.id] });
  };

  const reset = () => { setSubject(""); setBody(""); setOpen(null); };

  const sendEmail = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-send", {
        body: { workspaceId, to: contact.email, subject, html: `<p>${body.replace(/\n/g, "<br/>")}</p>` },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await logCrmActivity({
        workspaceId, recordType: "contact", recordId: contact.id, activityType: "email_sent",
        title: subject || "Email sent", description: body.slice(0, 200),
        actorUserId: user?.id, actorLabel: user?.email ?? undefined, source: "app",
      });
      toast.success("Email sent");
      reset(); refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to send email");
    } finally { setBusy(false); }
  };

  const sendSms = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-send", {
        body: { workspaceId, to: contact.phone, message: body },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await logCrmActivity({
        workspaceId, recordType: "contact", recordId: contact.id, activityType: "sms_sent",
        title: "SMS sent", description: body.slice(0, 200),
        actorUserId: user?.id, actorLabel: user?.email ?? undefined, source: "app",
      });
      toast.success("SMS sent");
      reset(); refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to send SMS");
    } finally { setBusy(false); }
  };

  const sendWhatsApp = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { workspaceId, to: contact.whatsapp_number || contact.phone, type: "text", body },
      });
      if (error) throw error;
      const res = data as any;
      if (res?.error) throw new Error(res.error);
      if (res?.success === false) {
        // The 24h customer-care window is closed — free text can't be delivered.
        throw new Error(res.fallback
          ? "This contact's 24-hour WhatsApp window is closed. Send an approved template from a campaign or automation instead."
          : res.reason || "WhatsApp send failed");
      }
      await logCrmActivity({
        workspaceId, recordType: "contact", recordId: contact.id, activityType: "whatsapp_sent",
        title: "WhatsApp sent", description: body.slice(0, 200),
        actorUserId: user?.id, actorLabel: user?.email ?? undefined, source: "app",
      });
      toast.success("WhatsApp message sent");
      reset(); refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to send WhatsApp message");
    } finally { setBusy(false); }
  };

  const logCall = async () => {
    setBusy(true);
    await logCrmActivity({
      workspaceId, recordType: "contact", recordId: contact.id, activityType: "call_logged",
      title: subject || "Call logged", description: body,
      actorUserId: user?.id, actorLabel: user?.email ?? undefined, source: "app",
    });
    toast.success("Call logged");
    setBusy(false);
    reset(); refresh();
  };

  const addTask = async () => {
    if (!contact.origin_lead_id) return;
    setBusy(true);
    try {
      await createTask.mutateAsync({
        lead_id: contact.origin_lead_id,
        workspace_id: workspaceId,
        title: taskTitle,
        due_date: taskDue || undefined,
      });
      await logCrmActivity({
        workspaceId, recordType: "contact", recordId: contact.id, activityType: "task_created",
        title: taskTitle, actorUserId: user?.id, actorLabel: user?.email ?? undefined,
      });
      setTaskTitle(""); setTaskDue("");
      reset(); refresh();
    } finally { setBusy(false); }
  };

  const enrol = async () => {
    if (!contact.origin_lead_id || !automationId) return;
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("execute-automation", {
        body: { automation_id: automationId, lead_id: contact.origin_lead_id, workspace_id: workspaceId },
      });
      if (error) throw error;
      await logCrmActivity({
        workspaceId, recordType: "contact", recordId: contact.id, activityType: "automation_enrolled",
        title: "Enrolled in automation",
        description: activeAutomations.find((a) => a.id === automationId)?.name ?? automationId,
        actorUserId: user?.id, actorLabel: user?.email ?? undefined,
        relatedType: "automation", relatedId: automationId,
      });
      toast.success("Contact enrolled");
      setAutomationId("");
      reset(); refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to enrol contact");
    } finally { setBusy(false); }
  };

  const action = (
    key: Channel,
    icon: React.ReactNode,
    label: string,
    disabledReason?: string | null,
  ) => (
    <TooltipProvider key={label} delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="outline" size="sm" disabled={!!disabledReason} onClick={() => setOpen(key)}>
              {icon}<span className="ml-2">{label}</span>
            </Button>
          </span>
        </TooltipTrigger>
        {disabledReason && <TooltipContent>{disabledReason}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {action("email", <Mail className="h-4 w-4" />, "Email",
          !contact.email ? "No email address on this contact"
            : optedOut ? "This contact has opted out of marketing"
            : !emailReady ? "Connect an email sender in Settings first" : null)}

        {action("sms", <MessageSquare className="h-4 w-4" />, "SMS",
          !contact.phone ? "No phone number on this contact"
            : optedOut ? "This contact has opted out"
            : !smsReady ? "Connect an SMS sender in Settings first" : null)}

        {action("whatsapp", <MessageCircle className="h-4 w-4" />, "WhatsApp",
          !(contact.whatsapp_number || contact.phone) ? "No WhatsApp number on this contact"
            : optedOut ? "This contact has opted out"
            : !waReady ? "Connect WhatsApp in Settings first" : null)}

        {action("call", <PhoneCall className="h-4 w-4" />, "Log call", null)}

        {action("task", <CheckSquare className="h-4 w-4" />, "Task",
          contact.origin_lead_id ? null : "Tasks attach to a linked lead record. This contact has no linked lead yet.")}

        {action("automation", <Workflow className="h-4 w-4" />, "Enrol",
          !contact.origin_lead_id ? "Automations run on a linked lead record. This contact has no linked lead yet."
            : activeAutomations.length === 0 ? "No active automations in this workspace" : null)}

        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/${workspaceId}/bookings`)}>
          <CalendarPlus className="h-4 w-4" /><span className="ml-2">Meeting</span>
        </Button>
      </div>

      {/* Email */}
      <Dialog open={open === "email"} onOpenChange={(v) => !v && reset()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email {contact.full_name || contact.email}</DialogTitle>
            <DialogDescription>Sends immediately through your connected email sender and logs to the timeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="qa-subject">Subject</Label><Input id="qa-subject" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><Label htmlFor="qa-body">Message</Label><Textarea id="qa-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={sendEmail} disabled={busy || !subject.trim() || !body.trim()}>{busy ? "Sending…" : "Send email"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS */}
      <Dialog open={open === "sms"} onOpenChange={(v) => !v && reset()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SMS {contact.phone}</DialogTitle>
            <DialogDescription>Uses your messaging credits and logs to the timeline.</DialogDescription>
          </DialogHeader>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your message…" />
          <p className="text-xs text-muted-foreground">{body.length} characters · {Math.max(1, Math.ceil(body.length / 160))} segment(s)</p>
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={sendSms} disabled={busy || !body.trim()}>{busy ? "Sending…" : "Send SMS"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp */}
      <Dialog open={open === "whatsapp"} onOpenChange={(v) => !v && reset()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WhatsApp {contact.whatsapp_number || contact.phone}</DialogTitle>
            <DialogDescription>
              Free-text WhatsApp only delivers inside the 24-hour customer-care window. Outside it, use an approved
              template from a campaign or automation.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your message…" />
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={sendWhatsApp} disabled={busy || !body.trim()}>{busy ? "Sending…" : "Send"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log call */}
      <Dialog open={open === "call"} onOpenChange={(v) => !v && reset()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a call</DialogTitle>
            <DialogDescription>NexusFlo24 doesn't place calls — this records the outcome on the timeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="qa-call-title">Summary</Label><Input id="qa-call-title" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Discovery call" /></div>
            <div><Label htmlFor="qa-call-notes">Notes</Label><Textarea id="qa-call-notes" rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={logCall} disabled={busy || !subject.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task */}
      <Dialog open={open === "task"} onOpenChange={(v) => !v && reset()}>
        <DialogContent>
          <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="qa-task">Title</Label><Input id="qa-task" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} /></div>
            <div><Label htmlFor="qa-due">Due date</Label><Input id="qa-due" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={addTask} disabled={busy || !taskTitle.trim()}>Create task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrol in automation */}
      <Dialog open={open === "automation"} onOpenChange={(v) => !v && reset()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enrol in automation</DialogTitle>
            <DialogDescription>Starts the automation immediately for this contact's linked lead record.</DialogDescription>
          </DialogHeader>
          <Select value={automationId} onValueChange={setAutomationId}>
            <SelectTrigger><SelectValue placeholder="Choose an automation" /></SelectTrigger>
            <SelectContent>
              {activeAutomations.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={enrol} disabled={busy || !automationId}>Enrol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactQuickActions;
