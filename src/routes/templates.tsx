import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { ApprovalStatusBadge } from "@/components/status-badges";
import { EmptyCard, PageIntro, SectionCard, StatCard } from "@/components/client-portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/app-state";
import type {
  ApprovalRecord,
  FollowupSequenceRecord,
  OutreachAssetRecord,
  OutreachTemplateRecord,
  OutreachTemplateVariantRecord,
} from "@/lib/leads-api";
import {
  useApprovalDecisionMutation,
  useArchiveOutreachTemplateVariantMutation,
  useCreateOutreachTemplateMutation,
  useFollowupSequenceApprovalDecisionMutation,
  useLeadAgentSummaryQuery,
  useTemplateVariantApprovalDecisionMutation,
  useUpdateOutreachAssetMutation,
  useUpdateCampaignImageSettingsMutation,
  useUpdateTemplateVariantContentMutation,
  useUploadOutreachAssetMutation,
} from "@/lib/leads-api-hooks";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates — Expert Technology Solutions" }] }),
  component: TemplatesPage,
});

type VariantDraft = {
  subject: string;
  body: string;
  cta: string;
  signature: string;
  includeImage: boolean;
  assetId: string;
  placement: string;
  altText: string;
  fallbackText: string;
};

type AssetDraftState = {
  assetId: string;
  title: string;
  description: string;
  fileUrl: string;
  originalFilename: string;
  mimeType: string;
  fileSize?: number | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  altText: string;
  placement: string;
  status: string;
  approvalId: string;
  approvalDecisionNote: string;
};

type RequestTarget =
  | { kind: "variant"; title: string; id: string }
  | { kind: "sequence"; title: string; id: string }
  | { kind: "asset"; title: string; approvalId: string };

type TemplateCreateState = {
  campaignId: string;
  campaignName: string;
} | null;

type TemplateCreateForm = {
  templateType: string;
  name: string;
  variantLabel: string;
  subject: string;
  body: string;
  cta: string;
  signature: string;
  notes: string;
  imageFile: File | null;
  imageAltText: string;
  imagePlacement: string;
};

const EMPTY_TEMPLATE_FORM: TemplateCreateForm = {
  templateType: "first_contact",
  name: "",
  variantLabel: "A",
  subject: "",
  body: "",
  cta: "",
  signature: "",
  notes: "",
  imageFile: null,
  imageAltText: "",
  imagePlacement: "inline",
};

type CampaignTemplateGroup = {
  campaignId: string;
  campaignName: string;
  launchState: string;
  launchNextAction: string;
  templates: OutreachTemplateRecord[];
  sequences: FollowupSequenceRecord[];
};

function TemplatesPage() {
  const { user } = useApp();
  const summaryQuery = useLeadAgentSummaryQuery();
  const templateVariantDecisionMutation = useTemplateVariantApprovalDecisionMutation();
  const followupSequenceDecisionMutation = useFollowupSequenceApprovalDecisionMutation();
  const updateTemplateVariantContentMutation = useUpdateTemplateVariantContentMutation();
  const createOutreachTemplateMutation = useCreateOutreachTemplateMutation();
  const archiveTemplateVariantMutation = useArchiveOutreachTemplateVariantMutation();
  const approvalDecisionMutation = useApprovalDecisionMutation();
  const updateOutreachAssetMutation = useUpdateOutreachAssetMutation();
  const uploadOutreachAssetMutation = useUploadOutreachAssetMutation();
  const updateCampaignImageSettingsMutation = useUpdateCampaignImageSettingsMutation();
  const canApprove = ["client_owner", "manager", "intergrai_admin"].includes(user?.role || "");
  const canEdit = canApprove;
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, VariantDraft>>({});
  const [assetDrafts, setAssetDrafts] = useState<Record<string, AssetDraftState>>({});
  const [requestChangesTarget, setRequestChangesTarget] = useState<RequestTarget | null>(null);
  const [requestChangesNote, setRequestChangesNote] = useState("");
  const [templateCreateState, setTemplateCreateState] = useState<TemplateCreateState>(null);
  const [templateCreateForm, setTemplateCreateForm] =
    useState<TemplateCreateForm>(EMPTY_TEMPLATE_FORM);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const data = summaryQuery.data;
  const approvalsByEntityKey = useMemo(() => {
    const map = new Map<string, ApprovalRecord>();
    for (const approval of data?.approvals || []) {
      if (!approval.entityId) continue;
      const key = `${approval.entityType}:${approval.entityId}`;
      if (!map.has(key)) {
        map.set(key, approval);
      }
    }
    return map;
  }, [data?.approvals]);

  const campaigns = useMemo(() => {
    if (!data) return [];
    const grouped = new Map<string, CampaignTemplateGroup>();
    const campaignNameById = new Map(
      data.campaigns
        .filter((item) => item.status !== "archived")
        .map((campaign) => [campaign.id, campaign.name || "Campaign"] as const),
    );

    for (const campaign of data.campaigns.filter((item) => item.status !== "archived")) {
      grouped.set(campaign.id, {
        campaignId: campaign.id,
        campaignName: campaign.name || "Campaign",
        launchState: campaign.launchState,
        launchNextAction: campaign.launchNextAction,
        templates: [],
        sequences: [],
      });
    }

    for (const template of data.outreachTemplates) {
      const visibleVariants = template.variants.filter(
        (variant) => normalizeApprovalStatus(variant.status) !== "archived",
      );
      if (!visibleVariants.length) continue;
      const key = template.campaignId || template.campaignName || "unassigned";
      const resolvedCampaignName =
        (template.campaignId ? campaignNameById.get(template.campaignId) : null) ||
        template.campaignName ||
        "Unassigned campaign";
      const existing = grouped.get(key) || {
        campaignId: template.campaignId || "",
        campaignName: resolvedCampaignName,
        launchState: "waiting_for_approval",
        launchNextAction: "Review campaign approvals before launch.",
        templates: [],
        sequences: [],
      };
      existing.templates.push({
        ...template,
        campaignName: resolvedCampaignName,
        variants: visibleVariants,
      });
      grouped.set(key, existing);
    }

    for (const sequence of data.followupSequences.filter(
      (item) => normalizeApprovalStatus(item.status) !== "archived",
    )) {
      const key = sequence.campaignId || sequence.campaignName || "unassigned";
      const resolvedCampaignName =
        (sequence.campaignId ? campaignNameById.get(sequence.campaignId) : null) ||
        sequence.campaignName ||
        "Unassigned campaign";
      const existing = grouped.get(key) || {
        campaignId: sequence.campaignId || "",
        campaignName: resolvedCampaignName,
        launchState: "waiting_for_approval",
        launchNextAction: "Review campaign approvals before launch.",
        templates: [],
        sequences: [],
      };
      existing.sequences.push({
        ...sequence,
        campaignName: resolvedCampaignName,
      });
      grouped.set(key, existing);
    }

    return Array.from(grouped.values())
      .filter(
        (group) =>
          group.campaignName && !/(demo|mock|placeholder|untitled)/i.test(group.campaignName),
      )
      .sort((left, right) => left.campaignName.localeCompare(right.campaignName));
  }, [data]);

  const availableCampaigns = useMemo(() => {
    return (data?.campaigns || [])
      .filter((campaign) => campaign.status !== "archived")
      .filter((campaign) => !/(demo|mock|placeholder|untitled)/i.test(campaign.name))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [data?.campaigns]);

  function startEditing(template: OutreachTemplateRecord, variant: OutreachTemplateVariantRecord) {
    const selectedAsset = findSelectedAsset(
      data?.outreachAssets || [],
      variant.imageSettings.assetId || variant.selectedImageAsset?.id,
    );
    setEditingVariantId(variant.id);
    setDrafts((current) => ({
      ...current,
      [variant.id]: {
        subject: variant.subjectTemplate || "",
        body: variant.bodyTemplate || "",
        cta: variant.callToAction || "",
        signature: variant.signature || "",
        includeImage: Boolean(variant.imageSettings.includeImage),
        assetId: variant.imageSettings.assetId || "",
        placement: variant.imageSettings.placement || "inline",
        altText: variant.imageSettings.altText || "",
        fallbackText: variant.imageSettings.fallbackText || "",
      },
    }));
    setAssetDrafts((current) => ({
      ...current,
      [variant.id]: assetToDraft(selectedAsset, template, variant),
    }));
  }

  function stopEditing(variantId: string) {
    setEditingVariantId((current) => (current === variantId ? null : current));
    setDrafts((current) => {
      const next = { ...current };
      delete next[variantId];
      return next;
    });
    setAssetDrafts((current) => {
      const next = { ...current };
      delete next[variantId];
      return next;
    });
  }

  function updateDraft(variantId: string, field: keyof VariantDraft, value: string | boolean) {
    setDrafts((current) => ({
      ...current,
      [variantId]: {
        ...(current[variantId] || createEmptyDraft()),
        [field]: value,
      },
    }));
  }

  function updateAssetDraft(
    variantId: string,
    field: keyof AssetDraftState,
    value: string | number | null,
  ) {
    setAssetDrafts((current) => ({
      ...current,
      [variantId]: {
        ...(current[variantId] || createEmptyAssetDraft()),
        [field]: value,
      },
    }));
  }

  async function saveVariant(
    template: OutreachTemplateRecord,
    variant: OutreachTemplateVariantRecord,
  ) {
    const draft = drafts[variant.id];
    if (!draft) return;

    try {
      await updateTemplateVariantContentMutation.mutateAsync({
        variantId: variant.id,
        input: {
          subject_template: draft.subject,
          body_template: draft.body,
          cta: draft.cta || "",
          signature: draft.signature || "",
          include_image: draft.includeImage,
          asset_id: draft.assetId || null,
          placement: draft.placement,
          alt_text: draft.altText || null,
          fallback_text: draft.fallbackText || null,
          approval_reset_reason: "Template edited after approval",
          metadata: {
            campaign_id: template.campaignId,
            campaign_name: template.campaignName,
            template_name: template.name,
            template_type: template.templateType,
            variant_label: variant.variantLabel,
          },
        },
      });

      stopEditing(variant.id);
      toast.success(
        normalizeApprovalStatus(variant.approvalStatus) === "approved"
          ? "Template changed. Outreach for this campaign is paused until this template is approved again."
          : "Changes saved.",
      );
      await summaryQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(
        message && !/internal service error|request failed \(500\)/i.test(message)
          ? message
          : "We couldn't save this email just now. Please try again.",
      );
    }
  }

  async function approveVariant(variantId: string) {
    try {
      await templateVariantDecisionMutation.mutateAsync({
        variantId,
        decision: "approved",
        decision_note: "Approved from the Templates page.",
      });
      toast.success("Template approved.");
      await summaryQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to approve that template.");
    }
  }

  async function approveSequence(sequenceId: string) {
    try {
      await followupSequenceDecisionMutation.mutateAsync({
        sequenceId,
        decision: "approved",
        decision_note: "Approved from the Templates page.",
      });
      toast.success("Follow-up sequence approved.");
      await summaryQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to approve that follow-up sequence.",
      );
    }
  }

  async function pauseVariantApproval(variantId: string) {
    try {
      await templateVariantDecisionMutation.mutateAsync({
        variantId,
        decision: "waiting_for_approval",
        decision_note: "Template paused until approval is confirmed again.",
      });
      toast.success("Template approval paused.");
      await summaryQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to pause that template approval.",
      );
    }
  }

  async function pauseSequenceApproval(sequenceId: string) {
    try {
      await followupSequenceDecisionMutation.mutateAsync({
        sequenceId,
        decision: "waiting_for_approval",
        decision_note: "Follow-up sequence paused until approval is confirmed again.",
      });
      toast.success("Follow-up approval paused.");
      await summaryQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to pause that follow-up approval.",
      );
    }
  }

  async function approveAsset(approvalId: string) {
    try {
      await approvalDecisionMutation.mutateAsync({
        approvalId,
        decision: "approved",
        decision_note: "Approved from the Templates page.",
      });
      toast.success("Image approval saved.");
      await summaryQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to approve that image.");
    }
  }

  function openFilePicker(variantId: string) {
    fileInputs.current[variantId]?.click();
  }

  async function uploadAssetForVariant(
    template: OutreachTemplateRecord,
    variant: OutreachTemplateVariantRecord,
    file?: File | null,
  ) {
    if (!file) return;

    const currentAssetDraft = assetDrafts[variant.id] || createEmptyAssetDraft();
    const currentAssetStatus = normalizeApprovalStatus(currentAssetDraft.status);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("campaign_id", template.campaignId || "");
    formData.append("template_variant_id", variant.id);
    formData.append("title", currentAssetDraft.title || `${template.name || "Email"} image`);
    formData.append("description", currentAssetDraft.description || "");
    formData.append("alt_text", currentAssetDraft.altText || "");
    formData.append("placement", currentAssetDraft.placement || "inline");
    if (currentAssetDraft.assetId) {
      formData.append("asset_id", currentAssetDraft.assetId);
    }

    try {
      const asset = await uploadOutreachAssetMutation.mutateAsync(formData);
      setAssetDrafts((current) => ({
        ...current,
        [variant.id]: assetToDraft(asset, template, variant),
      }));
      setDrafts((current) => ({
        ...current,
        [variant.id]: {
          ...(current[variant.id] || createEmptyDraft()),
          includeImage: true,
          assetId: asset.id,
          placement: asset.placement || "inline",
          altText: asset.altText || "",
        },
      }));
      toast.success(
        currentAssetStatus === "approved"
          ? "Image replaced. Save the image details, then approve it again before launch."
          : "Image uploaded. Review the details, then save the image.",
      );
      await summaryQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload that image.");
    }
  }

  async function saveAssetDetails(
    template: OutreachTemplateRecord,
    variant: OutreachTemplateVariantRecord,
  ) {
    const assetDraft = assetDrafts[variant.id];
    if (!assetDraft?.assetId) {
      toast.error("Upload an image first.");
      return;
    }
    if (!assetDraft.title.trim()) {
      toast.error("Image title is required.");
      return;
    }
    if (!assetDraft.altText.trim()) {
      toast.error("Alt text is required for email images.");
      return;
    }

    const previousStatus = normalizeApprovalStatus(assetDraft.status);

    try {
      const asset = await updateOutreachAssetMutation.mutateAsync({
        assetId: assetDraft.assetId,
        input: {
          title: assetDraft.title.trim(),
          description: assetDraft.description.trim(),
          alt_text: assetDraft.altText.trim(),
          placement: assetDraft.placement,
          campaign_id: template.campaignId || null,
          template_variant_id: variant.id,
          status: "pending_approval",
        },
      });

      setAssetDrafts((current) => ({
        ...current,
        [variant.id]: assetToDraft(asset, template, variant),
      }));
      setDrafts((current) => ({
        ...current,
        [variant.id]: {
          ...(current[variant.id] || createEmptyDraft()),
          includeImage: true,
          assetId: asset.id,
          placement: asset.placement || "inline",
          altText: asset.altText || "",
        },
      }));
      toast.success(
        previousStatus === "approved"
          ? "Image changed. It needs approval before launch."
          : "Image details saved. This image is now ready for approval.",
      );
      await summaryQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save that image.");
    }
  }

  function openTemplateCreate(campaignId: string, campaignName: string) {
    setTemplateCreateState({ campaignId, campaignName });
    setTemplateCreateForm({
      ...EMPTY_TEMPLATE_FORM,
      name: campaignName ? `${campaignName} outreach email` : "",
    });
  }

  function closeTemplateCreate() {
    setTemplateCreateState(null);
    setTemplateCreateForm(EMPTY_TEMPLATE_FORM);
  }

  async function saveTemplateCreate() {
    if (!templateCreateState?.campaignId) {
      toast.error("Choose a campaign first.");
      return;
    }
    if (!templateCreateForm.name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    if (!templateCreateForm.body.trim()) {
      toast.error("Template body is required.");
      return;
    }

    try {
      const variant = await createOutreachTemplateMutation.mutateAsync({
        campaign_id: templateCreateState.campaignId,
        name: templateCreateForm.name.trim(),
        template_type: templateCreateForm.templateType,
        variant_label: templateCreateForm.variantLabel.trim() || "A",
        subject_template: templateCreateForm.subject.trim() || null,
        body_template: templateCreateForm.body.trim(),
        cta: templateCreateForm.cta.trim() || null,
        signature: templateCreateForm.signature.trim() || null,
        notes: templateCreateForm.notes.trim() || null,
      });
      if (templateCreateForm.imageFile) {
        const selectedCampaign = availableCampaigns.find(
          (campaign) => campaign.id === templateCreateState.campaignId,
        );
        if (!selectedCampaign?.imagesEnabled) {
          await updateCampaignImageSettingsMutation.mutateAsync({
            campaignId: templateCreateState.campaignId,
            imagesEnabled: true,
          });
        }

        const formData = new FormData();
        formData.append("file", templateCreateForm.imageFile);
        formData.append("campaign_id", templateCreateState.campaignId);
        formData.append("template_variant_id", variant.id);
        formData.append("title", `${templateCreateForm.name.trim()} image`);
        formData.append("alt_text", templateCreateForm.imageAltText.trim());
        formData.append("placement", templateCreateForm.imagePlacement);
        formData.append("status", "pending_approval");
        const asset = await uploadOutreachAssetMutation.mutateAsync(formData);

        await updateTemplateVariantContentMutation.mutateAsync({
          variantId: variant.id,
          input: {
            subject_template: templateCreateForm.subject.trim() || null,
            body_template: templateCreateForm.body.trim(),
            cta: templateCreateForm.cta.trim() || null,
            signature: templateCreateForm.signature.trim() || null,
            include_image: true,
            asset_id: asset.id,
            placement: templateCreateForm.imagePlacement,
            alt_text: templateCreateForm.imageAltText.trim(),
            approval_reset_reason: "Image added during template creation",
          },
        });
      }
      toast.success("Template saved as draft. It now needs approval before the agent can use it.");
      closeTemplateCreate();
      await summaryQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save that template.");
    }
  }

  async function archiveTemplateVariant(
    template: OutreachTemplateRecord,
    variant: OutreachTemplateVariantRecord,
  ) {
    const confirmed = window.confirm(
      "This will stop the template from being used going forward. Past messages stay in history.",
    );
    if (!confirmed) return;

    try {
      await archiveTemplateVariantMutation.mutateAsync({ variantId: variant.id });
      if (editingVariantId === variant.id) {
        stopEditing(variant.id);
      }
      toast.success(`Archived ${buildVariantTitle(template, variant)}.`);
      await summaryQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive that template.");
    }
  }

  async function submitRequestChanges() {
    if (!requestChangesTarget) return;
    if (!requestChangesNote.trim()) {
      toast.error("Add a short note so the requested changes are clear.");
      return;
    }

    try {
      if (requestChangesTarget.kind === "variant") {
        await templateVariantDecisionMutation.mutateAsync({
          variantId: requestChangesTarget.id,
          decision: "changes_requested",
          decision_note: requestChangesNote.trim(),
        });
      } else if (requestChangesTarget.kind === "sequence") {
        await followupSequenceDecisionMutation.mutateAsync({
          sequenceId: requestChangesTarget.id,
          decision: "changes_requested",
          decision_note: requestChangesNote.trim(),
        });
      } else {
        await approvalDecisionMutation.mutateAsync({
          approvalId: requestChangesTarget.approvalId,
          decision: "changes_requested",
          decision_note: requestChangesNote.trim(),
        });
      }

      toast.success("Changes requested.");
      setRequestChangesTarget(null);
      setRequestChangesNote("");
      await summaryQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save that request.");
    }
  }

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return <TemplatesLoadingState />;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1240px]">
        <Card className="rounded-[28px] p-10 text-center shadow-card">
          <h1 className="text-2xl font-semibold">Templates unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn’t load the template workspace.
          </p>
        </Card>
      </div>
    );
  }

  const pendingVariantCount = data.outreachTemplates
    .flatMap((template) => template.variants)
    .filter((variant) => normalizeApprovalStatus(variant.status) !== "archived")
    .filter((variant) => normalizeApprovalStatus(variant.approvalStatus) === "pending").length;

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <PageIntro
        badge="Templates"
        title="What emails will the system send?"
        description="Review each campaign’s outreach emails, save edits clearly, and use the Approvals page as the central decision hub."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/approvals">Open approval hub</Link>
            </Button>
            <Button variant="outline" onClick={() => summaryQuery.refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      <div className="rounded-[24px] border border-primary/10 bg-primary/5 px-5 py-4 text-sm text-foreground">
        Images are optional. Text-first emails usually perform better for cold outreach. Sending
        remains paused, and edited approved emails must be approved again before launch.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Campaign sections"
          value={campaigns.length}
          detail="Templates are grouped by campaign."
        />
        <StatCard
          label="Needs approval"
          value={pendingVariantCount}
          detail="Pending email decisions still appear in the approval hub."
        />
        <StatCard
          label="Image assets"
          value={data.outreachAssets.length}
          detail="Optional email images only."
        />
        <StatCard
          label="Safety"
          value={data.sendingEnabled ? "Active" : "Paused"}
          detail="No send action is available here."
        />
      </div>

      {campaigns.length ? (
        campaigns.map((campaign) => (
          <SectionCard
            key={campaign.campaignId || campaign.campaignName}
            title={campaign.campaignName}
            description={`${describeCampaignTemplates(campaign.templates, campaign.sequences)} Launch state: ${friendlyLaunchState(campaign.launchState)}.`}
            action={
              canEdit && campaign.campaignId ? (
                <Button
                  size="sm"
                  onClick={() => openTemplateCreate(campaign.campaignId, campaign.campaignName)}
                >
                  Add template
                </Button>
              ) : undefined
            }
          >
            <div className="space-y-4">
              <div className="rounded-[22px] border border-border/70 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
                {campaign.launchNextAction || "Review campaign approvals before launch."}
              </div>
              {!campaign.templates.length && !campaign.sequences.length ? (
                <EmptyCard
                  title="No templates here yet"
                  description="Add a template when you want the agent to prepare outreach for this campaign."
                />
              ) : null}
              {campaign.templates.flatMap((template) =>
                template.variants.map((variant) => {
                  const approvalRecord = approvalsByEntityKey.get(
                    `outreach_template_variant:${variant.id}`,
                  );
                  const status = normalizeApprovalStatus(
                    approvalRecord?.decisionStatus ||
                      approvalRecord?.status ||
                      variant.approvalStatus,
                  );
                  const requestedNote =
                    approvalRecord?.decisionNote || variant.approvalDecisionNote || "";
                  const draft = drafts[variant.id];
                  const current = draft || variantToDraft(variant);
                  const editing = editingVariantId === variant.id;
                  const dirty = isVariantDirty(variant, current);
                  const selectedAsset = findSelectedAsset(
                    data.outreachAssets,
                    current.assetId ||
                      variant.imageSettings.assetId ||
                      variant.selectedImageAsset?.id,
                  );
                  const currentAssetDraft =
                    assetDrafts[variant.id] || assetToDraft(selectedAsset, template, variant);
                  const imageStatus = normalizeApprovalStatus(
                    currentAssetDraft.status ||
                      selectedAsset?.approvalStatus ||
                      selectedAsset?.status,
                  );

                  return (
                    <Card
                      key={variant.id}
                      className="rounded-[28px] border-border/70 p-5 shadow-none"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-border/70 bg-muted/10">
                              {friendlyTemplateType(template.templateType)}
                            </Badge>
                            {variant.variantLabel ? (
                              <Badge variant="outline" className="border-border/70 bg-muted/10">
                                Variant {variant.variantLabel}
                              </Badge>
                            ) : null}
                            {variant.latestQualityReview ? (
                              <Badge
                                variant="outline"
                                className="border-primary/20 bg-primary/5 text-primary"
                              >
                                Quality {variant.latestQualityReview.score}/100
                              </Badge>
                            ) : null}
                          </div>
                          <h3 className="mt-3 text-xl font-semibold">
                            {buildVariantTitle(template, variant)}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {campaign.campaignName}
                          </p>
                        </div>
                        <ApprovalStatusBadge status={status} />
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <TemplateMeta
                          label="Subject line"
                          value={current.subject || "No subject line"}
                        />
                        <TemplateMeta
                          label="Image included"
                          value={
                            current.includeImage && (selectedAsset || current.assetId)
                              ? "Yes"
                              : "No"
                          }
                        />
                        <TemplateMeta
                          label="Template name"
                          value={template.name || "Email template"}
                        />
                        <TemplateMeta label="Current status" value={statusLabel(status)} />
                      </div>

                      <div className="mt-5 overflow-hidden rounded-[24px] border border-border/70 bg-muted/10 px-4 py-5 sm:px-5">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          Email preview
                        </p>
                        <p className="mt-3 font-medium">{current.subject || "No subject line"}</p>
                        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
                          {editing ? current.body : current.body || "No email body yet."}
                        </pre>
                      </div>

                      {editing ? (
                        <div className="mt-5 space-y-4">
                          <div>
                            <p className="text-sm font-medium">Subject line</p>
                            <Input
                              className="mt-2"
                              value={current.subject}
                              onChange={(event) =>
                                updateDraft(variant.id, "subject", event.target.value)
                              }
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Email body</p>
                            <Textarea
                              className="mt-2 min-h-[220px]"
                              value={current.body}
                              onChange={(event) =>
                                updateDraft(variant.id, "body", event.target.value)
                              }
                            />
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="text-sm font-medium">CTA</p>
                              <Input
                                className="mt-2"
                                value={current.cta}
                                onChange={(event) =>
                                  updateDraft(variant.id, "cta", event.target.value)
                                }
                                placeholder="Optional CTA"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Signature</p>
                              <Input
                                className="mt-2"
                                value={current.signature}
                                onChange={(event) =>
                                  updateDraft(variant.id, "signature", event.target.value)
                                }
                                placeholder="Optional signature"
                              />
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-border/70 bg-background px-4 py-5 sm:px-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">Optional image</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Upload an approved image to include with this email. Images are
                                  optional and text-first emails usually perform better.
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  This image will appear inside the email after approval.
                                </p>
                              </div>
                              <ApprovalStatusBadge status={imageStatus} />
                            </div>

                            {currentAssetDraft.fileUrl ? (
                              <div className="mt-4 rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
                                <img
                                  src={currentAssetDraft.fileUrl}
                                  alt={currentAssetDraft.altText || current.altText}
                                  className="max-h-56 w-full rounded-2xl bg-background/80 p-3 object-contain"
                                />
                                <p className="mt-3 text-sm font-medium">
                                  {currentAssetDraft.title || "Linked image"}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {currentAssetDraft.originalFilename || "Uploaded image"} ·{" "}
                                  {friendlyPlacement(
                                    currentAssetDraft.placement || current.placement,
                                  )}
                                </p>
                              </div>
                            ) : (
                              <div className="mt-4 rounded-[20px] border border-dashed border-border bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                                No image uploaded yet
                              </div>
                            )}

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="md:col-span-2">
                                <input
                                  ref={(node) => {
                                    fileInputs.current[variant.id] = node;
                                  }}
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="hidden"
                                  onChange={(event) => {
                                    const nextFile = event.target.files?.[0] || null;
                                    void uploadAssetForVariant(template, variant, nextFile);
                                    event.currentTarget.value = "";
                                  }}
                                />
                                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={() => openFilePicker(variant.id)}
                                    disabled={uploadOutreachAssetMutation.isPending}
                                  >
                                    {currentAssetDraft.assetId
                                      ? "Upload / Replace image"
                                      : "Upload image"}
                                  </Button>
                                  <span className="text-sm text-muted-foreground">
                                    PNG, JPG/JPEG, or WebP up to 1MB.
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Use image</p>
                                <Select
                                  value={current.includeImage ? "yes" : "no"}
                                  onValueChange={(value) =>
                                    updateDraft(variant.id, "includeImage", value === "yes")
                                  }
                                >
                                  <SelectTrigger className="mt-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="no">No image</SelectItem>
                                    <SelectItem value="yes">Yes, include image</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Uploaded image</p>
                                <Select
                                  value={current.assetId || "__none__"}
                                  onValueChange={(value) => {
                                    const nextAssetId = value === "__none__" ? "" : value;
                                    updateDraft(variant.id, "assetId", nextAssetId);
                                    const nextAsset = findSelectedAsset(
                                      data.outreachAssets,
                                      nextAssetId,
                                    );
                                    setAssetDrafts((currentDrafts) => ({
                                      ...currentDrafts,
                                      [variant.id]: assetToDraft(nextAsset, template, variant),
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="No image selected" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">No image selected</SelectItem>
                                    {data.outreachAssets
                                      .filter(
                                        (asset) =>
                                          asset.campaignId === template.campaignId ||
                                          asset.templateVariantId === variant.id,
                                      )
                                      .map((asset) => (
                                        <SelectItem key={asset.id} value={asset.id}>
                                          {asset.title || "Image"} ·{" "}
                                          {statusLabel(
                                            normalizeApprovalStatus(
                                              asset.approvalStatus || asset.status,
                                            ),
                                          )}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Image title</p>
                                <Input
                                  className="mt-2"
                                  value={currentAssetDraft.title}
                                  onChange={(event) =>
                                    updateAssetDraft(variant.id, "title", event.target.value)
                                  }
                                  placeholder="Short image title"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Placement</p>
                                <Select
                                  value={currentAssetDraft.placement || current.placement}
                                  onValueChange={(value) => {
                                    updateAssetDraft(variant.id, "placement", value);
                                    updateDraft(variant.id, "placement", value);
                                  }}
                                >
                                  <SelectTrigger className="mt-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="header">Header</SelectItem>
                                    <SelectItem value="inline">Inline</SelectItem>
                                    <SelectItem value="footer">Footer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Alt text</p>
                                <Input
                                  className="mt-2"
                                  value={currentAssetDraft.altText}
                                  onChange={(event) => {
                                    updateAssetDraft(variant.id, "altText", event.target.value);
                                    updateDraft(variant.id, "altText", event.target.value);
                                  }}
                                  placeholder="Describe what the image shows"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-sm font-medium">Image note</p>
                                <Textarea
                                  className="mt-2 min-h-[96px]"
                                  value={currentAssetDraft.description}
                                  onChange={(event) =>
                                    updateAssetDraft(variant.id, "description", event.target.value)
                                  }
                                  placeholder="Optional note about how this image should be used."
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Linked campaign</p>
                                <Input className="mt-2" value={campaign.campaignName} readOnly />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Linked template</p>
                                <Input
                                  className="mt-2"
                                  value={buildVariantTitle(template, variant)}
                                  readOnly
                                />
                              </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => void saveAssetDetails(template, variant)}
                                disabled={
                                  updateOutreachAssetMutation.isPending ||
                                  !currentAssetDraft.assetId
                                }
                                title={
                                  !currentAssetDraft.assetId ? "Upload an image first." : undefined
                                }
                              >
                                Save image details
                              </Button>
                              {canApprove &&
                              currentAssetDraft.approvalId &&
                              imageStatus === "pending" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => void approveAsset(currentAssetDraft.approvalId)}
                                  >
                                    Approve image
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => {
                                      setRequestChangesTarget({
                                        kind: "asset",
                                        title: currentAssetDraft.title || "Image",
                                        approvalId: currentAssetDraft.approvalId,
                                      });
                                      setRequestChangesNote(
                                        currentAssetDraft.approvalDecisionNote || "",
                                      );
                                    }}
                                  >
                                    Request Changes
                                  </Button>
                                </>
                              ) : null}
                            </div>

                            {currentAssetDraft.status &&
                            normalizeApprovalStatus(currentAssetDraft.status) === "approved" ? (
                              <p className="mt-3 text-sm text-warning-foreground">
                                If this image changes, it will need approval again before launch.
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <Button
                              className="w-full sm:w-auto"
                              onClick={() => void saveVariant(template, variant)}
                              disabled={!dirty || updateTemplateVariantContentMutation.isPending}
                            >
                              Save changes
                            </Button>
                            <Button
                              className="w-full sm:w-auto"
                              variant="outline"
                              onClick={() => stopEditing(variant.id)}
                            >
                              Cancel
                            </Button>
                            <Button
                              className="w-full sm:w-auto"
                              variant="outline"
                              onClick={() => void archiveTemplateVariant(template, variant)}
                              disabled={archiveTemplateVariantMutation.isPending}
                            >
                              Archive template
                            </Button>
                            {!dirty ? (
                              <Badge
                                variant="outline"
                                className="w-full justify-center border-border/70 bg-muted/10 text-muted-foreground sm:w-auto"
                              >
                                No unsaved changes
                              </Badge>
                            ) : null}
                          </div>

                          {normalizeApprovalStatus(variant.approvalStatus) === "approved" ? (
                            <p className="text-sm text-warning-foreground">
                              Saving changes will reset approval. The updated email must be approved
                              again before launch.
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-5 space-y-4">
                          <div className="rounded-[24px] border border-border/70 bg-background px-5 py-5">
                            <p className="font-medium">Optional image</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {selectedAsset
                                ? `${selectedAsset.title || "Linked image"} · ${friendlyPlacement(selectedAsset.placement || current.placement)} · ${statusLabel(imageStatus)}`
                                : "No image selected"}
                            </p>
                            {selectedAsset?.fileUrl ? (
                              <img
                                src={selectedAsset.fileUrl}
                                alt={selectedAsset.altText || current.altText}
                                className="mt-4 max-h-56 w-full rounded-2xl bg-background/80 p-3 object-contain"
                              />
                            ) : null}
                            {selectedAsset?.altText ? (
                              <p className="mt-3 text-sm text-muted-foreground">
                                Alt text: {selectedAsset.altText}
                              </p>
                            ) : null}
                            {selectedAsset?.approvalDecisionNote ? (
                              <p className="mt-3 text-sm text-muted-foreground">
                                {selectedAsset.approvalDecisionNote}
                              </p>
                            ) : null}
                            {canApprove &&
                            selectedAsset?.approvalId &&
                            imageStatus === "pending" ? (
                              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() => void approveAsset(selectedAsset.approvalId)}
                                >
                                  Approve image
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() => {
                                    setRequestChangesTarget({
                                      kind: "asset",
                                      title: selectedAsset.title || "Image",
                                      approvalId: selectedAsset.approvalId,
                                    });
                                    setRequestChangesNote(selectedAsset.approvalDecisionNote || "");
                                  }}
                                >
                                  Request image changes
                                </Button>
                              </div>
                            ) : null}
                          </div>

                          {requestedNote ? (
                            <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                              Latest change request: {requestedNote}
                            </div>
                          ) : null}

                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            {canEdit ? (
                              <Button
                                className="w-full sm:w-auto"
                                variant="outline"
                                onClick={() => startEditing(template, variant)}
                              >
                                Edit
                              </Button>
                            ) : null}
                            {canEdit ? (
                              <Button
                                className="w-full sm:w-auto"
                                variant="outline"
                                onClick={() => void archiveTemplateVariant(template, variant)}
                                disabled={archiveTemplateVariantMutation.isPending}
                              >
                                Archive template
                              </Button>
                            ) : null}
                            {canApprove && status === "pending" ? (
                              <>
                                <Button
                                  className="w-full sm:w-auto"
                                  onClick={() => void approveVariant(variant.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() => {
                                    setRequestChangesTarget({
                                      kind: "variant",
                                      title: buildVariantTitle(template, variant),
                                      id: variant.id,
                                    });
                                    setRequestChangesNote(requestedNote);
                                  }}
                                >
                                  Request changes
                                </Button>
                              </>
                            ) : null}
                            {canApprove && status === "approved" ? (
                              <Button
                                className="w-full sm:w-auto"
                                variant="outline"
                                onClick={() => void pauseVariantApproval(variant.id)}
                              >
                                Unapprove / Pause
                              </Button>
                            ) : null}
                            {status === "approved" ? (
                              <Badge
                                variant="outline"
                                className="w-full justify-center border-success/30 bg-success/10 text-success sm:w-auto"
                              >
                                Approved
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                }),
              )}

              {campaign.sequences.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {campaign.sequences.map((sequence) => {
                    const status = normalizeApprovalStatus(
                      sequence.approvalStatus || sequence.approvalDecisionStatus,
                    );
                    return (
                      <Card
                        key={sequence.id}
                        className="rounded-[26px] border-border/70 p-5 shadow-none"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <Badge variant="outline" className="border-border/70 bg-muted/10">
                              Follow-up
                            </Badge>
                            <h3 className="mt-3 text-lg font-semibold">
                              {sequence.name ||
                                `Follow-up sequence for ${sequence.campaignName || campaign.campaignName}`}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {sequence.followupCount} follow-up step
                              {sequence.followupCount === 1 ? "" : "s"}
                            </p>
                          </div>
                          <ApprovalStatusBadge status={status} />
                        </div>
                        {sequence.approvalDecisionNote ? (
                          <div className="mt-4 rounded-[20px] border border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                            Latest note: {sequence.approvalDecisionNote}
                          </div>
                        ) : null}
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          {canApprove && status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => void approveSequence(sequence.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => {
                                  setRequestChangesTarget({
                                    kind: "sequence",
                                    title: sequence.name || "Follow-up sequence",
                                    id: sequence.id,
                                  });
                                  setRequestChangesNote(sequence.approvalDecisionNote || "");
                                }}
                              >
                                Request changes
                              </Button>
                            </>
                          ) : (
                            <>
                              {canApprove && status === "approved" ? (
                                <Button
                                  size="sm"
                                  className="w-full sm:w-auto"
                                  variant="outline"
                                  onClick={() => void pauseSequenceApproval(sequence.id)}
                                >
                                  Unapprove / Pause
                                </Button>
                              ) : null}
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                              >
                                <Link to="/approvals">View in approval hub</Link>
                              </Button>
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </SectionCard>
        ))
      ) : (
        <EmptyCard
          title="No email templates available yet"
          description="Prepared outreach templates will appear here once campaign drafts are ready."
        />
      )}

      <Dialog
        open={Boolean(templateCreateState)}
        onOpenChange={(open) => {
          if (!open) closeTemplateCreate();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add template</DialogTitle>
            <DialogDescription>
              Templates must be approved before the agent can use them.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Campaign</p>
              <Select
                value={templateCreateState?.campaignId || "__none__"}
                onValueChange={(value) => {
                  const nextCampaign =
                    availableCampaigns.find((campaign) => campaign.id === value) || null;
                  setTemplateCreateState(
                    nextCampaign
                      ? { campaignId: nextCampaign.id, campaignName: nextCampaign.name }
                      : null,
                  );
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCampaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium">Template type</p>
              <Select
                value={templateCreateForm.templateType}
                onValueChange={(value) =>
                  setTemplateCreateForm((current) => ({ ...current, templateType: value }))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_contact">First outreach</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="reply">Reply</SelectItem>
                  <SelectItem value="manual_reply">Manual reply</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium">Template name</p>
              <Input
                className="mt-2"
                value={templateCreateForm.name}
                onChange={(event) =>
                  setTemplateCreateForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Example: Managed IT first outreach"
              />
            </div>
            <div>
              <p className="text-sm font-medium">Variant name</p>
              <Input
                className="mt-2"
                value={templateCreateForm.variantLabel}
                onChange={(event) =>
                  setTemplateCreateForm((current) => ({
                    ...current,
                    variantLabel: event.target.value,
                  }))
                }
                placeholder="Example: A"
              />
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium">Subject line</p>
              <Input
                className="mt-2"
                value={templateCreateForm.subject}
                onChange={(event) =>
                  setTemplateCreateForm((current) => ({ ...current, subject: event.target.value }))
                }
                placeholder="Optional subject line"
              />
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium">Body</p>
              <Textarea
                className="mt-2 min-h-[220px]"
                value={templateCreateForm.body}
                onChange={(event) =>
                  setTemplateCreateForm((current) => ({ ...current, body: event.target.value }))
                }
                placeholder="Write the email body here."
              />
            </div>
            <div>
              <p className="text-sm font-medium">CTA</p>
              <Input
                className="mt-2"
                value={templateCreateForm.cta}
                onChange={(event) =>
                  setTemplateCreateForm((current) => ({ ...current, cta: event.target.value }))
                }
                placeholder="Optional CTA"
              />
            </div>
            <div>
              <p className="text-sm font-medium">Signature</p>
              <Textarea
                className="mt-2 min-h-[100px]"
                value={templateCreateForm.signature}
                onChange={(event) =>
                  setTemplateCreateForm((current) => ({
                    ...current,
                    signature: event.target.value,
                  }))
                }
                placeholder="Kind regards,\nExpert Technology Solutions"
              />
            </div>
            <div>
              <p className="text-sm font-medium">Optional image</p>
              <Input
                className="mt-2"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  setTemplateCreateForm((current) => ({
                    ...current,
                    imageFile: event.target.files?.[0] ?? null,
                  }))
                }
              />
              <p className="mt-2 text-xs text-muted-foreground">PNG, JPG, or WebP up to 1MB.</p>
            </div>
            {templateCreateForm.imageFile ? (
              <>
                <div>
                  <p className="text-sm font-medium">Image alt text</p>
                  <Input
                    className="mt-2"
                    value={templateCreateForm.imageAltText}
                    onChange={(event) =>
                      setTemplateCreateForm((current) => ({
                        ...current,
                        imageAltText: event.target.value,
                      }))
                    }
                    placeholder="Describe what the image shows"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Image placement</p>
                  <Select
                    value={templateCreateForm.imagePlacement}
                    onValueChange={(value) =>
                      setTemplateCreateForm((current) => ({ ...current, imagePlacement: value }))
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="inline">Inside email</SelectItem>
                      <SelectItem value="footer">Footer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}
            <div className="md:col-span-2">
              <p className="text-sm font-medium">Notes</p>
              <Textarea
                className="mt-2 min-h-[100px]"
                value={templateCreateForm.notes}
                onChange={(event) =>
                  setTemplateCreateForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Optional internal guidance for this template."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTemplateCreate}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveTemplateCreate()}
              disabled={
                createOutreachTemplateMutation.isPending ||
                uploadOutreachAssetMutation.isPending ||
                updateTemplateVariantContentMutation.isPending ||
                updateCampaignImageSettingsMutation.isPending ||
                (Boolean(templateCreateForm.imageFile) && !templateCreateForm.imageAltText.trim())
              }
            >
              {createOutreachTemplateMutation.isPending || uploadOutreachAssetMutation.isPending
                ? "Saving..."
                : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(requestChangesTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRequestChangesTarget(null);
            setRequestChangesNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              Explain what should change so the next review is clear and actionable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
              <p className="font-medium">{requestChangesTarget?.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium">What should change?</p>
              <Textarea
                className="mt-2 min-h-[140px]"
                value={requestChangesNote}
                onChange={(event) => setRequestChangesNote(event.target.value)}
                placeholder="Example: shorten the opening line, make the CTA more specific, and remove the broad claim in paragraph two."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRequestChangesTarget(null);
                setRequestChangesNote("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void submitRequestChanges()}>Save request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplatesLoadingState() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <Skeleton className="h-44 rounded-[32px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[24px]" />
        ))}
      </div>
      <Skeleton className="h-[720px] rounded-[28px]" />
    </div>
  );
}

function TemplateMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-background px-4 py-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}

function createEmptyDraft(): VariantDraft {
  return {
    subject: "",
    body: "",
    cta: "",
    signature: "",
    includeImage: false,
    assetId: "",
    placement: "inline",
    altText: "",
    fallbackText: "",
  };
}

function createEmptyAssetDraft(): AssetDraftState {
  return {
    assetId: "",
    title: "",
    description: "",
    fileUrl: "",
    originalFilename: "",
    mimeType: "",
    fileSize: null,
    imageWidth: null,
    imageHeight: null,
    altText: "",
    placement: "inline",
    status: "draft",
    approvalId: "",
    approvalDecisionNote: "",
  };
}

function assetToDraft(
  asset: OutreachAssetRecord | null,
  template: OutreachTemplateRecord,
  variant: OutreachTemplateVariantRecord,
): AssetDraftState {
  if (!asset) {
    return {
      ...createEmptyAssetDraft(),
      title: `${template.name || "Email"} image`,
      altText: variant.imageSettings.altText || "",
      placement: variant.imageSettings.placement || "inline",
    };
  }

  return {
    assetId: asset.id,
    title: asset.title || `${template.name || "Email"} image`,
    description: asset.description || "",
    fileUrl: asset.fileUrl || "",
    originalFilename: asset.originalFilename || "",
    mimeType: asset.mimeType || "",
    fileSize: asset.fileSize ?? null,
    imageWidth: asset.imageWidth ?? null,
    imageHeight: asset.imageHeight ?? null,
    altText: asset.altText || variant.imageSettings.altText || "",
    placement: asset.placement || variant.imageSettings.placement || "inline",
    status: asset.approvalStatus || asset.status || "draft",
    approvalId: asset.approvalId || "",
    approvalDecisionNote: asset.approvalDecisionNote || "",
  };
}

function variantToDraft(variant: OutreachTemplateVariantRecord): VariantDraft {
  return {
    subject: variant.subjectTemplate || "",
    body: variant.bodyTemplate || "",
    cta: variant.callToAction || "",
    signature: variant.signature || "",
    includeImage: Boolean(variant.imageSettings.includeImage),
    assetId: variant.imageSettings.assetId || "",
    placement: variant.imageSettings.placement || "inline",
    altText: variant.imageSettings.altText || "",
    fallbackText: variant.imageSettings.fallbackText || "",
  };
}

function isVariantDirty(variant: OutreachTemplateVariantRecord, draft: VariantDraft) {
  return (
    draft.subject !== (variant.subjectTemplate || "") ||
    draft.body !== (variant.bodyTemplate || "") ||
    draft.cta !== (variant.callToAction || "") ||
    draft.signature !== (variant.signature || "") ||
    draft.includeImage !== Boolean(variant.imageSettings.includeImage) ||
    draft.assetId !== (variant.imageSettings.assetId || "") ||
    draft.placement !== (variant.imageSettings.placement || "inline") ||
    draft.altText !== (variant.imageSettings.altText || "") ||
    draft.fallbackText !== (variant.imageSettings.fallbackText || "")
  );
}

function findSelectedAsset(assets: OutreachAssetRecord[], assetId?: string) {
  if (!assetId) return null;
  return assets.find((asset) => asset.id === assetId) || null;
}

function buildVariantTitle(
  template: OutreachTemplateRecord,
  variant: OutreachTemplateVariantRecord,
) {
  const type = friendlyTemplateType(template.templateType);
  const variantLabel = variant.variantLabel ? ` · Variant ${variant.variantLabel}` : "";
  return `${type} for ${template.name || template.campaignName || "campaign"}${variantLabel}`;
}

function describeCampaignTemplates(
  templates: OutreachTemplateRecord[],
  sequences: FollowupSequenceRecord[],
) {
  const emailCount = templates.reduce((total, template) => total + template.variants.length, 0);
  const followups = sequences.reduce((total, sequence) => total + sequence.followupCount, 0);
  return `${emailCount} email ${emailCount === 1 ? "variant" : "variants"}${followups ? ` · ${followups} follow-up ${followups === 1 ? "step" : "steps"}` : ""}`;
}

function friendlyLaunchState(value: string) {
  switch ((value || "").toLowerCase()) {
    case "approved_ready":
      return "Ready to launch";
    case "live":
      return "Live";
    case "paused_needs_approval":
      return "Paused - approval needed";
    case "archived":
      return "Archived";
    default:
      return "Needs approval";
  }
}

function friendlyTemplateType(value: string) {
  switch ((value || "").toLowerCase()) {
    case "first_contact":
      return "First email";
    case "follow_up":
      return "Follow-up email";
    case "reply":
      return "Reply template";
    case "manual_reply":
      return "Manual reply";
    case "variant":
      return "Variant";
    default:
      return (
        value
          .split("_")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ") || "Email"
      );
  }
}

function friendlyPlacement(value: string) {
  switch ((value || "").toLowerCase()) {
    case "attachment_link":
      return "Attachment link";
    default:
      return (
        value
          .split("_")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ") || "Inline"
      );
  }
}

function normalizeApprovalStatus(
  value?: string,
): "pending" | "approved" | "changes_requested" | "archived" {
  switch ((value || "").toLowerCase()) {
    case "approved":
      return "approved";
    case "rejected":
    case "changes_requested":
    case "request_changes":
    case "declined":
      return "changes_requested";
    case "archived":
      return "archived";
    default:
      return "pending";
  }
}

function statusLabel(value: "pending" | "approved" | "changes_requested" | "archived") {
  switch (value) {
    case "approved":
      return "Approved";
    case "changes_requested":
      return "Changes requested";
    case "archived":
      return "Archived";
    default:
      return "Needs approval";
  }
}
