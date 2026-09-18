import { Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useVoiceNumbers, useVoiceAssistants } from "@/hooks/useVoice";
import { VoiceEmptyState, VoiceSetupNotice, VoiceSection } from "@/components/voice/VoicePrimitives";
import { VOICE_PROVIDER_LABEL, VOICE_STARTER_ENTITLEMENT } from "@/lib/voice/constants";

export default function VoiceNumbers() {
  const workspaceId = useWorkspaceId();
  const { data: numbers = [], isLoading } = useVoiceNumbers(workspaceId);
  const { data: assistants = [] } = useVoiceAssistants(workspaceId);
  const assistantName = (id: string | null) => assistants.find((a) => a.id === id)?.name ?? "Unassigned";

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Phone Numbers</h1>
        <p className="text-sm text-muted-foreground">The numbers your receptionist answers on.</p>
      </div>

      <VoiceSetupNotice compact />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : numbers.length === 0 ? (
        <VoiceEmptyState
          icon={Hash}
          title="No phone numbers yet"
          description={`Numbers are supplied through ${VOICE_PROVIDER_LABEL}, starting with UK numbers. Buying and assigning numbers is switched on in a later step, once the calling service is connected.`}
        />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Assistant</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Call routing</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.phone_number}</TableCell>
                    <TableCell className="text-sm">{assistantName(n.assistant_id)}</TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">{n.provider}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{n.webhook_status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{n.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <VoiceSection title="What your plan allows" description="Limits are stored per workspace, so they can be changed without a code release.">
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>{VOICE_STARTER_ENTITLEMENT.maxNumbers} phone number</li>
          <li>{VOICE_STARTER_ENTITLEMENT.maxAssistants} active assistant</li>
          <li>{VOICE_STARTER_ENTITLEMENT.maxConcurrentCalls} call at a time</li>
          <li>{VOICE_STARTER_ENTITLEMENT.includedMinutes} included minutes each billing period</li>
        </ul>
      </VoiceSection>
    </div>
  );
}
