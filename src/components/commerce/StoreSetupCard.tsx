import { useState } from "react";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStore } from "@/hooks/useCommerce";

const CURRENCIES = ["GBP", "USD", "EUR", "NGN", "CAD", "AUD"];

export default function StoreSetupCard() {
  const createStore = useCreateStore();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [email, setEmail] = useState("");

  return (
    <div className="mx-auto max-w-xl rounded-2xl border bg-card p-8 text-center">
      <Store className="mx-auto mb-4 h-10 w-10 text-accent" />
      <h2 className="text-xl font-bold">Create your branded storefront</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sell products, services, memberships and digital downloads with payments going straight into your own
        Stripe account.
      </p>

      <div className="mt-6 space-y-4 text-left">
        <div>
          <Label htmlFor="store-name">Store name</Label>
          <Input id="store-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Studio" />
        </div>
        <div>
          <Label htmlFor="store-email">Business email</Label>
          <Input
            id="store-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="orders@acme.com"
          />
        </div>
        <div>
          <Label htmlFor="store-currency">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="store-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        className="mt-6 w-full"
        disabled={!name.trim() || !email.trim() || createStore.isPending}
        onClick={() => createStore.mutate({ name: name.trim(), currency, business_email: email.trim() })}
      >
        Create storefront
      </Button>
    </div>
  );
}
