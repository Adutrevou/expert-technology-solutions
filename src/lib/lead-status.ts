import type { LeadRecord } from "@/lib/leads-api";

export type NormalizedLeadStatus =
  | "Company found"
  | "Finding contact/email"
  | "Outreach ready"
  | "Contacted"
  | "Reply received"
  | "Blocked/Avoided"
  | "Needs review";

export interface NormalizedLeadStatusCounts {
  total: number;
  companyFound: number;
  findingContactEmail: number;
  enrichmentQueue: number;
  outreachReady: number;
  contacted: number;
  replies: number;
  blockedAvoided: number;
  needsReviewTrueOnly: number;
}

const GENERIC_INBOX_LOCAL_PARTS = new Set([
  "admin",
  "contact",
  "enquiries",
  "enquiry",
  "hello",
  "help",
  "hr",
  "info",
  "jobs",
  "marketing",
  "office",
  "reception",
  "sales",
  "service",
  "support",
  "team",
]);

const CONTACT_PLACEHOLDERS = [
  "decision-maker not verified yet",
  "decision maker not verified yet",
  "generic inbox",
  "not provided",
  "unknown",
];

const BLOCKED_STATUS_TOKENS = new Set([
  "avoided",
  "bad_fit",
  "bad fit",
  "blocked",
  "blocked/avoided",
  "blocked_avoided",
  "competitor",
  "duplicate",
  "duplicate suppressed",
  "duplicate_suppressed",
  "excluded",
  "failed no email",
  "failed_no_email",
  "fake",
  "not qualified",
  "not_qualified",
  "suppressed",
  "test",
]);

const REPLY_STATUS_TOKENS = new Set([
  "interested",
  "needs reply approval",
  "needs_reply_approval",
  "positive_reply",
  "positive reply",
  "replied",
  "reply received",
  "reply_received",
]);

const CONTACTED_STATUS_TOKENS = new Set([
  "contacted",
  "outreach sent",
  "outreach_sent",
  "sent",
]);

const READY_STATUS_TOKENS = new Set([
  "outreach ready",
  "outreach_ready",
  "sendable",
  "send_ready",
  "verified_real",
]);

const PREPARED_STATUS_TOKENS = new Set([
  "outreach prepared",
  "outreach_prepared",
  "planned",
  "prepared",
  "queued_for_send",
  "waiting_to_send",
]);

const COMPANY_FOUND_STATUS_TOKENS = new Set([
  "company found",
  "company_found",
  "raw company",
  "raw_company",
  "researching",
]);

const FINDING_STATUS_TOKENS = new Set([
  "decision maker found",
  "decision_maker_found",
  "email_found_unverified",
  "enrichment queue",
  "enrichment_queue",
  "finding contact/email",
  "finding_contact_email",
  "manual review",
  "manual_review",
  "missing_email",
  "needs enrichment",
  "needs_enrichment",
  "needs review",
  "needs_review",
  "no_contact_found",
  "qualified",
  "qualified company",
  "qualified_company",
  "qualified_for_enrichment",
  "research_needed",
  "review",
  "reviewed",
  "verified contact",
  "verified_contact",
]);

function normalizeToken(value: string) {
  return String(value || "").trim().toLowerCase();
}

function isRealLookingEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isGenericInboxEmail(value: string) {
  if (!isRealLookingEmail(value)) {
    return false;
  }

  const localPart = value.trim().toLowerCase().split("@")[0] || "";
  return GENERIC_INBOX_LOCAL_PARTS.has(localPart);
}

function isSuppressedEmail(value: string) {
  if (!isRealLookingEmail(value)) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("noreply") ||
    normalized.includes("no-reply") ||
    normalized.includes("donotreply") ||
    normalized.includes("do-not-reply") ||
    normalized.endsWith("@example.com") ||
    normalized.endsWith("@test.com") ||
    normalized.endsWith("@internal") ||
    normalized.endsWith(".local")
  );
}

function hasNamedContact(lead: LeadRecord) {
  const company = normalizeToken(lead.company);
  return [lead.displayContactName, lead.name]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .some((value) => {
      const normalized = normalizeToken(value);
      return (
        normalized.length > 0 &&
        normalized !== company &&
        !CONTACT_PLACEHOLDERS.some((placeholder) => normalized === placeholder || normalized.startsWith(`${placeholder} `))
      );
    });
}

function getStatusCandidates(lead: LeadRecord) {
  return [
    lead.clientStatusLabel,
    lead.canonicalStatus,
    lead.displayStatus,
    lead.internalDisplayStatus,
    lead.clientVisibleStatus,
    lead.workflowStatus,
    lead.status,
    lead.rawStatus,
    lead.enrichmentStatus,
    lead.outreachStatus,
    lead.replyDraftStatus,
    lead.nextAction,
  ]
    .map((value) => normalizeToken(value))
    .filter(Boolean);
}

function hasAnyStatusToken(candidates: string[], tokens: Set<string>) {
  return candidates.some((candidate) => tokens.has(candidate));
}

export function hasUsableLeadEmail(lead: LeadRecord) {
  return Boolean(
    lead.email &&
    isRealLookingEmail(lead.email) &&
    !isGenericInboxEmail(lead.email) &&
    !isSuppressedEmail(lead.email),
  );
}

export function normalizeLeadStatus(lead: LeadRecord | null | undefined): NormalizedLeadStatus {
  if (!lead) {
    return "Company found";
  }

  const statusCandidates = getStatusCandidates(lead);
  const hasEmail = Boolean(lead.email && isRealLookingEmail(lead.email));
  const usableEmail = hasUsableLeadEmail(lead);
  const namedContact = hasNamedContact(lead);

  if (lead.isExcluded || lead.isDuplicateSuppressed || hasAnyStatusToken(statusCandidates, BLOCKED_STATUS_TOKENS)) {
    return "Blocked/Avoided";
  }

  if (hasAnyStatusToken(statusCandidates, REPLY_STATUS_TOKENS)) {
    return "Reply received";
  }

  if (lead.isContacted || hasAnyStatusToken(statusCandidates, CONTACTED_STATUS_TOKENS)) {
    return "Contacted";
  }

  if (lead.trueHumanReviewRequired && hasAnyStatusToken(statusCandidates, FINDING_STATUS_TOKENS)) {
    return "Needs review";
  }

  if (lead.isSendable) {
    return "Outreach ready";
  }

  if (hasAnyStatusToken(statusCandidates, READY_STATUS_TOKENS)) {
    return usableEmail ? "Outreach ready" : "Finding contact/email";
  }

  if (hasAnyStatusToken(statusCandidates, PREPARED_STATUS_TOKENS)) {
    return usableEmail ? "Outreach ready" : "Finding contact/email";
  }

  if (usableEmail) {
    return "Outreach ready";
  }

  if (hasAnyStatusToken(statusCandidates, COMPANY_FOUND_STATUS_TOKENS)) {
    return namedContact || hasEmail ? "Finding contact/email" : "Company found";
  }

  if (hasAnyStatusToken(statusCandidates, FINDING_STATUS_TOKENS)) {
    return "Finding contact/email";
  }

  if (namedContact || hasEmail) {
    return "Finding contact/email";
  }

  return "Company found";
}

export function deriveNormalizedLeadStatusCounts(leads: LeadRecord[]): NormalizedLeadStatusCounts {
  const counts: NormalizedLeadStatusCounts = {
    total: leads.length,
    companyFound: 0,
    findingContactEmail: 0,
    enrichmentQueue: 0,
    outreachReady: 0,
    contacted: 0,
    replies: 0,
    blockedAvoided: 0,
    needsReviewTrueOnly: 0,
  };

  for (const lead of leads) {
    switch (normalizeLeadStatus(lead)) {
      case "Company found":
        counts.companyFound += 1;
        break;
      case "Finding contact/email":
        counts.findingContactEmail += 1;
        break;
      case "Outreach ready":
        counts.outreachReady += 1;
        break;
      case "Contacted":
        counts.contacted += 1;
        break;
      case "Reply received":
        counts.replies += 1;
        break;
      case "Blocked/Avoided":
        counts.blockedAvoided += 1;
        break;
      case "Needs review":
        counts.needsReviewTrueOnly += 1;
        break;
    }
  }

  counts.enrichmentQueue = counts.companyFound + counts.findingContactEmail;
  return counts;
}
