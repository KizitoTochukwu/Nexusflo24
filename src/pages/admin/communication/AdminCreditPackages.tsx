import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { PackageOpen, Plus } from "lucide-react";
import { useCreditPackages, useUpsertCreditPackage, useCreditPricingRules, useUpsertPricingRule } from "@/hooks/useAdminCommunication";

export default function AdminCreditPackages() {
  const { data: pkgs = [] } = useCreditPackages();
  const { data: rules = [] } = useCreditPricingRules();
  const upsertPkg = useUpsertCreditPackage();
  const upsertRule = useUpsertPricingRule();
  const [form, setForm] = useState<any>({ channel: "email", name: "", credits: 1000, price_cents: 500, currency: "usd", is_active: true, sort_order: 0 });
  const [rule, setRule] = useState<any>({ channel: "sms", country: "", credits_per_message: 1 });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><PackageOpen className="h-6 w-6" /> Credit Packages & Pricing</h1>

        <Tabs defaultValue="packages">
          <TabsList>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="pricing">Pricing rules</TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Add package</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-6 gap-3 items-end">
                <div><Label>Channel</Label>
                  <Select value={form.channel} onValueChange={(v)=>setForm({...form,channel:v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Name</Label><Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></div>
                <div><Label>Credits</Label><Input type="number" value={form.credits} onChange={(e)=>setForm({...form,credits:Number(e.target.value)})} /></div>
                <div><Label>Price (cents)</Label><Input type="number" value={form.price_cents} onChange={(e)=>setForm({...form,price_cents:Number(e.target.value)})} /></div>
                <div><Label>Stripe price ID</Label><Input value={form.stripe_price_id||""} onChange={(e)=>setForm({...form,stripe_price_id:e.target.value})} /></div>
                <Button onClick={()=>upsertPkg.mutate(form)}><Plus className="h-4 w-4" /></Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr>
                    <th className="text-left p-2">Channel</th><th className="text-left p-2">Name</th>
                    <th className="text-right p-2">Credits</th><th className="text-right p-2">Price</th>
                    <th className="text-left p-2">Stripe</th><th className="text-left p-2">Active</th>
                  </tr></thead>
                  <tbody>
                    {pkgs.map((p:any) => (
                      <tr key={p.id} className="border-t">
                        <td className="p-2 uppercase text-xs">{p.channel}</td>
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2 text-right">{p.credits.toLocaleString()}</td>
                        <td className="p-2 text-right">${(p.price_cents/100).toFixed(2)}</td>
                        <td className="p-2 font-mono text-xs">{p.stripe_price_id || "—"}</td>
                        <td className="p-2"><Switch checked={p.is_active} onCheckedChange={(v)=>upsertPkg.mutate({...p,is_active:v})} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Add / update pricing rule</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-4 gap-3 items-end">
                <div><Label>Channel</Label>
                  <Select value={rule.channel} onValueChange={(v)=>setRule({...rule,channel:v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Country (blank = default)</Label><Input maxLength={2} value={rule.country} onChange={(e)=>setRule({...rule,country:e.target.value.toUpperCase()})} /></div>
                <div><Label>Credits / message</Label><Input type="number" value={rule.credits_per_message} onChange={(e)=>setRule({...rule,credits_per_message:Number(e.target.value)})} /></div>
                <Button onClick={()=>upsertRule.mutate({...rule, country: rule.country || null})}>Save</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr>
                    <th className="text-left p-2">Channel</th><th className="text-left p-2">Country</th><th className="text-right p-2">Credits / message</th>
                  </tr></thead>
                  <tbody>
                    {rules.map((r:any)=>(
                      <tr key={r.id} className="border-t">
                        <td className="p-2 uppercase text-xs">{r.channel}</td>
                        <td className="p-2">{r.country || <span className="text-muted-foreground">default</span>}</td>
                        <td className="p-2 text-right">{r.credits_per_message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
