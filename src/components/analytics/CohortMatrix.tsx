import { useMemo } from "react";
import { startOfWeek, differenceInWeeks, format } from "date-fns";

interface CohortMatrixProps {
  leads: any[];
  activities: any[];
}

export default function CohortMatrix({ leads, activities }: CohortMatrixProps) {
  const matrix = useMemo(() => {
    if (!leads.length) return [];

    const now = new Date();
    const cohorts = new Map<string, { week: string; leadIds: Set<string> }>();

    for (const lead of leads) {
      const created = new Date(lead.created_at);
      const weekStart = startOfWeek(created, { weekStartsOn: 1 });
      const key = weekStart.toISOString();
      if (!cohorts.has(key)) {
        cohorts.set(key, { week: key, leadIds: new Set() });
      }
      cohorts.get(key)!.leadIds.add(lead.id);
    }

    const activityByLead = new Map<string, Date[]>();
    for (const act of activities) {
      if (!activityByLead.has(act.lead_id)) activityByLead.set(act.lead_id, []);
      activityByLead.get(act.lead_id)!.push(new Date(act.created_at));
    }

    const sorted = Array.from(cohorts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8);

    return sorted.map(([key, cohort]) => {
      const cohortStart = new Date(key);
      const totalLeads = cohort.leadIds.size;
      const maxWeeks = Math.min(differenceInWeeks(now, cohortStart), 8);
      const retention: number[] = [];

      for (let w = 0; w <= maxWeeks; w++) {
        let active = 0;
        for (const leadId of cohort.leadIds) {
          const acts = activityByLead.get(leadId) || [];
          const hasActivity = acts.some(d => {
            const weekDiff = differenceInWeeks(d, cohortStart);
            return weekDiff === w;
          });
          if (hasActivity || w === 0) active++;
        }
        retention.push(totalLeads > 0 ? Math.round((active / totalLeads) * 100) : 0);
      }

      return {
        label: format(cohortStart, "MMM d"),
        total: totalLeads,
        retention,
      };
    });
  }, [leads, activities]);

  if (!matrix.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Not enough data for cohort analysis.</p>;
  }

  const maxWeeks = Math.max(...matrix.map(r => r.retention.length));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Cohort</th>
            <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Leads</th>
            {Array.from({ length: maxWeeks }, (_, i) => (
              <th key={i} className="px-2 py-1.5 text-center font-medium text-muted-foreground">W{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.label} className="border-b last:border-0">
              <td className="px-2 py-1.5 font-medium">{row.label}</td>
              <td className="px-2 py-1.5 text-center">{row.total}</td>
              {row.retention.map((pct, i) => (
                <td key={i} className="px-2 py-1.5 text-center">
                  <span
                    className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `hsl(46 67% 52% / ${Math.max(pct / 100, 0.08)})`,
                      color: pct > 50 ? "hsl(213 70% 14%)" : "hsl(213 30% 40%)",
                    }}
                  >
                    {pct}%
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
