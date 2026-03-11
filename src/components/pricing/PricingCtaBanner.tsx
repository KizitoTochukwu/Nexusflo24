import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

const PricingCtaBanner = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-hero py-20 text-center">
      <div className="container max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light/50 px-4 py-1.5 text-sm text-gold mb-4">
          <Zap className="h-3.5 w-3.5" /> No credit card required
        </div>
        <h2 className="text-3xl font-extrabold text-primary-foreground md:text-4xl">
          Ready to Grow <span className="text-gradient-gold">Smarter?</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-primary-foreground/70">
          Start your 14-day free trial today. No commitments, no credit card — just results.
        </p>
        <Button
          size="lg"
          className="mt-8 bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold px-8"
          onClick={() => navigate("/register")}
        >
          Start Free Trial
        </Button>
      </div>
    </section>
  );
};

export default PricingCtaBanner;
