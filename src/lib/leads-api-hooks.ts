import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addLeadComment,
  archiveCampaign,
  archiveOutreachTemplateVariant,
  classifyAgentTrainingContent,
  createCampaign,
  createOutreachTemplate,
  createResponseRule,
  createAgentTrainingEntry,
  decideCampaignApproval,
  decideFollowupSequenceApproval,
  createOutreachAsset,
  createMission,
  createReplyDraft,
  createRequest,
  decideApproval,
  decideEnrichmentCreditApproval,
  decideTemplateVariantApproval,
  getAgentTraining,
  getCampaigns,
  getConversationDetail,
  getConversations,
  getDashboard,
  getLeadAgentSummary,
  getLeadActivity,
  getLeads,
  getMicrosoftReplySyncStatus,
  getOutreachRenderPreview,
  getRequestDetail,
  getRequests,
  getReports,
  getResponseRules,
  startMicrosoftReplySyncOAuth,
  startMailboxOAuth,
  uploadOutreachAssetFile,
  updateCampaign,
  updateCampaignImageSettings,
  updateAgentTrainingEntry,
  updateLeadStatus,
  updateOutreachAsset,
  updateTemplateVariantContent,
  type AgentTrainingEntryRecord,
  type LeadUserSummary,
  type LeadWorkflowStatus,
  type MailboxOAuthStartResponse,
  type MissionRecord,
  type OutreachAssetRecord,
  type ResponseRuleRecord,
  type ReplyDraftRecord,
  type RequestDetailRecord,
  updateReplyDraft,
  updateResponseRule,
  updateTemplateVariantImageSettings,
} from "@/lib/leads-api";
import { useApp } from "@/lib/app-state";

const isBrowser = typeof window !== "undefined";
const LEADS_QUERY_KEY = ["intergrai", "leads"] as const;
const REQUESTS_QUERY_KEY = ["intergrai", "requests"] as const;

export function useDashboardQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "dashboard"],
    queryFn: getDashboard,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useLeadsQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: LEADS_QUERY_KEY,
    queryFn: getLeads,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useCampaignsQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "campaigns", "archived"],
    queryFn: () => getCampaigns({ includeArchived: true }),
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useReportsQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "reports"],
    queryFn: getReports,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useRequestsQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: REQUESTS_QUERY_KEY,
    queryFn: getRequests,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useRequestDetailQuery(requestId?: string) {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "request-detail", requestId],
    queryFn: () => getRequestDetail(requestId || ""),
    enabled: isBrowser && isAuthenticated && Boolean(requestId),
    retry: 1,
  });
}

export function useLeadActivityQuery(leadId?: string) {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "lead-activity", leadId],
    queryFn: () => getLeadActivity(leadId || ""),
    enabled: isBrowser && isAuthenticated && Boolean(leadId),
    retry: 1,
  });
}

export function useLeadAgentSummaryQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "lead-agent"],
    queryFn: getLeadAgentSummary,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useResponseRulesQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "response-rules"],
    queryFn: getResponseRules,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useMicrosoftReplySyncStatusQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "microsoft-reply-sync-status"],
    queryFn: getMicrosoftReplySyncStatus,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useOutreachRenderPreviewQuery(queueItemId?: string) {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "outreach-render-preview", queueItemId],
    queryFn: () => getOutreachRenderPreview(queueItemId || ""),
    enabled: isBrowser && isAuthenticated && Boolean(queueItemId),
    retry: 1,
  });
}

export function useConversationsQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "conversations"],
    queryFn: getConversations,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useConversationDetailQuery(conversationId?: string) {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "conversation-detail", conversationId],
    queryFn: () => getConversationDetail(conversationId || ""),
    enabled: isBrowser && isAuthenticated && Boolean(conversationId),
    retry: 1,
  });
}

export function useCreateReplyDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation<ReplyDraftRecord, Error, { conversationId: string }>({
    mutationFn: ({ conversationId }) => createReplyDraft(conversationId),
    onSuccess: (draft) => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
      if (draft.conversationId) {
        void queryClient.invalidateQueries({ queryKey: ["intergrai", "conversation-detail", draft.conversationId] });
      }
    },
  });
}

export function useUpdateReplyDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation<ReplyDraftRecord, Error, { draftId: string; status: string; approval_note?: string; draft_subject?: string; draft_body?: string }>({
    mutationFn: ({ draftId, status, approval_note, draft_subject, draft_body }) =>
      updateReplyDraft(draftId, { status, approval_note, draft_subject, draft_body }),
    onSuccess: (draft) => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
      if (draft.conversationId) {
        void queryClient.invalidateQueries({ queryKey: ["intergrai", "conversation-detail", draft.conversationId] });
      }
    },
  });
}

export function useCreateResponseRuleMutation() {
  const queryClient = useQueryClient();

  return useMutation<ResponseRuleRecord, Error, Record<string, unknown>>({
    mutationFn: (input) => createResponseRule(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "response-rules"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useUpdateResponseRuleMutation() {
  const queryClient = useQueryClient();

  return useMutation<ResponseRuleRecord, Error, { ruleId: string; input: Record<string, unknown> }>({
    mutationFn: ({ ruleId, input }) => updateResponseRule(ruleId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "response-rules"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useAgentTrainingQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "agent-training"],
    queryFn: getAgentTraining,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useUpdateLeadStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, status, user }: { leadId: string; status: LeadWorkflowStatus; user: LeadUserSummary }) =>
      updateLeadStatus(leadId, status, user),
    onSuccess: (_status, variables) => {
      void queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-activity", variables.leadId] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useClassifyAgentTrainingMutation() {
  return useMutation({
    mutationFn: ({ content }: { content: string }) => classifyAgentTrainingContent(content),
  });
}

export function useAddLeadCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, comment, user }: { leadId: string; comment: string; user: LeadUserSummary }) =>
      addLeadComment(leadId, comment, user),
    onSuccess: (_activity, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-activity", variables.leadId] });
      void queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useCreateRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      category: string;
      title: string;
      message: string;
      created_by_name: string;
      created_by_email: string;
      created_by_role: string;
    }) => createRequest(input),
    onSuccess: (request: RequestDetailRecord) => {
      void queryClient.invalidateQueries({ queryKey: REQUESTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
      if (request.id) {
        void queryClient.invalidateQueries({ queryKey: ["intergrai", "request-detail", request.id] });
      }
    },
  });
}

export function useCreateMissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      title: string;
      instruction: string;
      assigned_worker_type?: string;
      campaign_id?: string;
    }) => createMission(input),
    onSuccess: (mission: MissionRecord) => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
      if (mission.id) {
        void queryClient.invalidateQueries({ queryKey: ["intergrai", "mission", mission.id] });
      }
    },
  });
}

export function useStartMailboxOAuthMutation() {
  return useMutation<MailboxOAuthStartResponse, Error, { mailboxId: string }>({
    mutationFn: ({ mailboxId }) => startMailboxOAuth(mailboxId),
  });
}

export function useStartMicrosoftReplySyncOAuthMutation() {
  const queryClient = useQueryClient();

  return useMutation<MailboxOAuthStartResponse, Error, void>({
    mutationFn: () => startMicrosoftReplySyncOAuth(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "microsoft-reply-sync-status"] });
    },
  });
}

export function useApprovalDecisionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { approvalId: string; decision: "approved" | "rejected" | "changes_requested" | "request_changes" | "waiting_for_approval"; decision_note?: string }) =>
      decideApproval(input.approvalId, {
        decision: input.decision,
        decision_note: input.decision_note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useCampaignApprovalDecisionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { campaignId: string; decision: "approved" | "rejected" | "changes_requested" | "request_changes" | "waiting_for_approval"; decision_note?: string }) =>
      decideCampaignApproval(input.campaignId, {
        decision: input.decision,
        decision_note: input.decision_note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useCreateCampaignMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) => createCampaign(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useUpdateCampaignMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, input }: { campaignId: string; input: Record<string, unknown> }) => updateCampaign(campaignId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useArchiveCampaignMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId }: { campaignId: string }) => archiveCampaign(campaignId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useTemplateVariantApprovalDecisionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { variantId: string; decision: "approved" | "rejected" | "changes_requested" | "request_changes" | "waiting_for_approval"; decision_note?: string }) =>
      decideTemplateVariantApproval(input.variantId, {
        decision: input.decision,
        decision_note: input.decision_note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useUpdateTemplateVariantContentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ variantId, input }: { variantId: string; input: Record<string, unknown> }) =>
      updateTemplateVariantContent(variantId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useCreateOutreachTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) => createOutreachTemplate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useArchiveOutreachTemplateVariantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ variantId }: { variantId: string }) => archiveOutreachTemplateVariant(variantId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useFollowupSequenceApprovalDecisionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { sequenceId: string; decision: "approved" | "rejected" | "changes_requested" | "request_changes" | "waiting_for_approval"; decision_note?: string }) =>
      decideFollowupSequenceApproval(input.sequenceId, {
        decision: input.decision,
        decision_note: input.decision_note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useCreateOutreachAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation<OutreachAssetRecord, Error, Record<string, unknown>>({
    mutationFn: (input) => createOutreachAsset(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useUploadOutreachAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation<OutreachAssetRecord, Error, FormData>({
    mutationFn: (formData) => uploadOutreachAssetFile(formData),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useUpdateOutreachAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation<OutreachAssetRecord, Error, { assetId: string; input: Record<string, unknown> }>({
    mutationFn: ({ assetId, input }) => updateOutreachAsset(assetId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useUpdateCampaignImageSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, imagesEnabled }: { campaignId: string; imagesEnabled: boolean }) =>
      updateCampaignImageSettings(campaignId, { images_enabled: imagesEnabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useUpdateTemplateVariantImageSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ variantId, input }: { variantId: string; input: Record<string, unknown> }) =>
      updateTemplateVariantImageSettings(variantId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useEnrichmentCreditApprovalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { queueItemId: string; decision: "approved" | "rejected"; decision_note?: string }) =>
      decideEnrichmentCreditApproval(input.queueItemId, {
        decision: input.decision,
        decision_note: input.decision_note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useCreateAgentTrainingEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      category: string;
      title?: string;
      content: string;
      visibility?: string;
      status?: string;
      applies_to?: string;
    }) => createAgentTrainingEntry(input),
    onSuccess: (_entry: AgentTrainingEntryRecord) => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "agent-training"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
    },
  });
}

export function useUpdateAgentTrainingEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, ...input }: {
      entryId: string;
      category?: string;
      title?: string;
      content?: string;
      status?: string;
      visibility?: string;
      applies_to?: string;
    }) => updateAgentTrainingEntry(entryId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "agent-training"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
    },
  });
}
