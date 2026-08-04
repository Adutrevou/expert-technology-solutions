import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import {
  commitContactImport,
  enrollContact,
  getContactImport,
  previewContactImport,
  updateContact,
} from "@/lib/contacts-import-api";

const isBrowser = typeof window !== "undefined";

export function usePreviewImportMutation() {
  return useMutation({
    mutationFn: ({
      file,
      campaignId,
      sequenceId,
    }: {
      file: File;
      campaignId?: string;
      sequenceId?: string;
    }) => previewContactImport(file, { campaignId, sequenceId }),
  });
}

export function useCommitImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      importId,
      sequenceId,
      audienceType,
    }: {
      importId: string;
      sequenceId?: string;
      audienceType?: "existing_clients";
    }) => commitContactImport(importId, sequenceId, audienceType),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "leads"] });
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "contact-import", variables.importId],
      });
      if (variables.sequenceId) {
        void queryClient.invalidateQueries({
          queryKey: ["intergrai", "sequence-enrollments", variables.sequenceId],
        });
        void queryClient.invalidateQueries({
          queryKey: ["intergrai", "sequence-metrics", variables.sequenceId],
        });
      }
    },
  });
}

export function useContactImportQuery(importId?: string) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ["intergrai", "contact-import", importId],
    queryFn: () => getContactImport(importId as string),
    enabled: isBrowser && isAuthenticated && Boolean(importId),
    retry: 1,
  });
}

export function useUpdateContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      patch,
    }: {
      leadId: string;
      patch: Parameters<typeof updateContact>[1];
    }) => updateContact(leadId, patch),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["intergrai", "leads"] }),
  });
}

export function useEnrollContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      sequenceId,
      source,
    }: {
      leadId: string;
      sequenceId: string;
      source?: string;
    }) => enrollContact(leadId, sequenceId, source),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-enrollments", variables.sequenceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-metrics", variables.sequenceId],
      });
    },
  });
}
