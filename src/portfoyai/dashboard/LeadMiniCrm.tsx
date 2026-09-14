import { useMemo, useState } from "react";
import { Download, Mail, Merge, Phone, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DashboardLead } from "@/lib/lead-realtime";
import {
  createLeadCsv,
  filterLeads,
  findDuplicateLeads,
} from "@/lib/lead-crm.mjs";

const statuses = ["new", "contacted", "appointment", "won", "lost"] as const;
type Props = {
  leads: DashboardLead[];
  listingTitles: Map<string, string>;
  loading: boolean;
  onUpdate: (
    lead: DashboardLead,
    changes: Record<string, unknown>,
  ) => Promise<void>;
  onMerge: (primary: DashboardLead, duplicateId: string) => Promise<void>;
};
export function LeadMiniCrm({
  leads,
  listingTitles,
  loading,
  onUpdate,
  onMerge,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<DashboardLead | null>(null);
  const visible = useMemo(
    () => filterLeads(leads, query, filter),
    [filter, leads, query],
  );
  const duplicates = selected ? findDuplicateLeads(leads, selected) : [];
  const download = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([`\ufeff${createLeadCsv(visible)}`], {
        type: "text/csv;charset=utf-8",
      }),
    );
    link.download = "fastate-leads.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>{t("dashboard.leads.crmTitle")}</CardTitle>
            <CardDescription>
              {t("dashboard.leads.crmDescription", { count: leads.length })}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={download}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("dashboard.leads.search")}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("dashboard.leads.allStatuses")}
              </SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`dashboard.leads.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>{t("common.loading")}</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
            <div className="space-y-2">
              {visible.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  className="w-full rounded-xl border bg-white p-4 text-left hover:border-[#173f32]"
                >
                  <div className="flex justify-between gap-3">
                    <strong>{lead.name}</strong>
                    <span className="rounded-full bg-[#edf1eb] px-2 py-1 text-xs">
                      {t(`dashboard.leads.status.${lead.crm_status || "new"}`)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-[#69756e]">
                    {lead.phone}
                    {lead.email ? ` · ${lead.email}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-[#879088]">
                    {lead.listing_id
                      ? listingTitles.get(lead.listing_id) || lead.listing_id
                      : lead.source || "public-site"}
                  </div>
                </button>
              ))}
              {!visible.length ? (
                <p className="p-5 text-sm text-[#69756e]">
                  {t("dashboard.leads.empty")}
                </p>
              ) : null}
            </div>
            {selected ? (
              <div className="space-y-4 rounded-2xl border bg-white p-5">
                <div className="flex flex-wrap gap-2">
                  <a href={`tel:${selected.phone}`}>
                    <Button size="sm">
                      <Phone className="mr-1 h-4 w-4" />
                      {t("dashboard.leads.call")}
                    </Button>
                  </a>
                  <a
                    href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" variant="outline">
                      WhatsApp
                    </Button>
                  </a>
                  {selected.email ? (
                    <a href={`mailto:${selected.email}`}>
                      <Button size="sm" variant="outline">
                        <Mail className="mr-1 h-4 w-4" />
                        {t("dashboard.leads.emailAction")}
                      </Button>
                    </a>
                  ) : null}
                </div>
                <div>
                  <Label>{t("dashboard.leads.pipeline")}</Label>
                  <Select
                    value={selected.crm_status || "new"}
                    onValueChange={(crm_status) =>
                      void onUpdate(selected, { crm_status }).then(() =>
                        setSelected({
                          ...selected,
                          crm_status: crm_status as DashboardLead["crm_status"],
                        }),
                      )
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {t(`dashboard.leads.status.${status}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("dashboard.leads.assignee")}</Label>
                  <Input
                    defaultValue={selected.assignee || ""}
                    onBlur={(e) =>
                      void onUpdate(selected, { assignee: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>{t("dashboard.leads.note")}</Label>
                  <Textarea
                    defaultValue={selected.note || ""}
                    onBlur={(e) =>
                      void onUpdate(selected, { note: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>{t("dashboard.leads.reminder")}</Label>
                  <Input
                    type="datetime-local"
                    defaultValue={selected.reminder_at?.slice(0, 16) || ""}
                    onBlur={(e) =>
                      void onUpdate(selected, {
                        reminder_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                  />
                </div>
                {duplicates.length ? (
                  <div>
                    <Label>{t("dashboard.leads.duplicates")}</Label>
                    {duplicates.map((duplicate) => (
                      <Button
                        key={duplicate.id}
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => void onMerge(selected, duplicate.id)}
                      >
                        <Merge className="mr-2 h-4 w-4" />
                        {duplicate.name}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <div>
                  <Label>{t("dashboard.leads.activity")}</Label>
                  <div className="mt-2 space-y-2 text-xs text-[#69756e]">
                    {selected.activities?.map((activity) => (
                      <div key={activity.id} className="border-l-2 pl-3">
                        {activity.detail || activity.activity_type}
                        <div>
                          {new Date(activity.created_at).toLocaleString()}
                        </div>
                      </div>
                    )) || null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border bg-white p-6 text-sm text-[#69756e]">
                {t("dashboard.leads.select")}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
