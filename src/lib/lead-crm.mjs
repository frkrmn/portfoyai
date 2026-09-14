const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
export const filterLeads = (leads, query, status) => {
  const needle = query.toLocaleLowerCase("tr-TR");
  return leads.filter((lead) => (status === "all" || lead.crm_status === status) && [lead.name, lead.phone, lead.email, lead.message, lead.assignee].some((value) => value?.toLocaleLowerCase("tr-TR").includes(needle)));
};
export const createLeadCsv = (leads) => [["name", "phone", "email", "status", "assignee", "source", "listing_id", "note", "reminder_at", "created_at"], ...leads.map((lead) => [lead.name, lead.phone, lead.email, lead.crm_status, lead.assignee, lead.source, lead.listing_id, lead.note, lead.reminder_at, lead.created_at])].map((row) => row.map(csvCell).join(",")).join("\n");
export const findDuplicateLeads = (leads, selected) => leads.filter((lead) => lead.id !== selected.id && (lead.phone.replace(/\D/g, "") === selected.phone.replace(/\D/g, "") || Boolean(lead.email && selected.email && lead.email.toLowerCase() === selected.email.toLowerCase())));
