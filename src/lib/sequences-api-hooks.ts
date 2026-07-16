import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import {
  archiveSequence,
  createSequence,
  createSequenceStep,
  deleteSequenceStep,
  disqualifyEnrollment,
  dryRunSequenceEngine,
  enrollLeadsInSequence,
  getSequence,
  getSequenceMetrics,
  listEnrollments,
  listSequences,
  pauseSequence,
  resumeSequence,
  runSequenceOnce,
  updateSequence,
  updateSequenceStep,
  type EnrollmentSource,
  type EnrollmentStatus,
  type SendingMode,
  type SequenceRecord,
  type SequenceStatus,
} from "@/lib/sequences-api";

const isBrowser = typeof window !== "undefined";
const SEQUENCES_KEY = ["intergrai", "sequences"] as const;

export function useSequencesQuery() {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: SEQUENCES_KEY,
    queryFn: listSequences,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useSequenceQuery(sequenceId?: string) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ["intergrai", "sequence-detail", sequenceId],
    queryFn: () => getSequence(sequenceId as string),
    enabled: isBrowser && isAuthenticated && Boolean(sequenceId),
    retry: 1,
  });
}

export function useSequenceMetricsQuery(sequenceId?: string) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ["intergrai", "sequence-metrics", sequenceId],
    queryFn: () => getSequenceMetrics(sequenceId as string),
    enabled: isBrowser && isAuthenticated && Boolean(sequenceId),
    retry: 1,
  });
}

export function useEnrollmentsQuery(sequenceId?: string, status?: EnrollmentStatus) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ["intergrai", "sequence-enrollments", sequenceId, status],
    queryFn: () => listEnrollments(sequenceId as string, status),
    enabled: isBrowser && isAuthenticated && Boolean(sequenceId),
    retry: 1,
  });
}

export function useCreateSequenceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; campaign_id?: string; sending_mode?: SendingMode }) =>
      createSequence(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: SEQUENCES_KEY }),
  });
}

export function useUpdateSequenceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sequenceId,
      patch,
    }: {
      sequenceId: string;
      patch: Parameters<typeof updateSequence>[1];
    }) => updateSequence(sequenceId, patch),
    onSuccess: (_sequence, variables) => {
      void queryClient.invalidateQueries({ queryKey: SEQUENCES_KEY });
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-detail", variables.sequenceId],
      });
    },
  });
}

function useSequenceStatusMutation(fn: (sequenceId: string) => Promise<SequenceRecord>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sequenceId: string) => fn(sequenceId),
    onSuccess: (_sequence, sequenceId) => {
      void queryClient.invalidateQueries({ queryKey: SEQUENCES_KEY });
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-detail", sequenceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-enrollments", sequenceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-metrics", sequenceId],
      });
    },
  });
}

export function useArchiveSequenceMutation() {
  return useSequenceStatusMutation(archiveSequence);
}
export function usePauseSequenceMutation() {
  return useSequenceStatusMutation(pauseSequence);
}
export function useResumeSequenceMutation() {
  return useSequenceStatusMutation(resumeSequence);
}

export function useCreateSequenceStepMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sequenceId,
      input,
    }: {
      sequenceId: string;
      input: Parameters<typeof createSequenceStep>[1];
    }) => createSequenceStep(sequenceId, input),
    onSuccess: (_step, variables) =>
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-detail", variables.sequenceId],
      }),
  });
}

export function useUpdateSequenceStepMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sequenceId,
      stepId,
      patch,
    }: {
      sequenceId: string;
      stepId: string;
      patch: Parameters<typeof updateSequenceStep>[2];
    }) => updateSequenceStep(sequenceId, stepId, patch),
    onSuccess: (_step, variables) =>
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-detail", variables.sequenceId],
      }),
  });
}

export function useDeleteSequenceStepMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sequenceId, stepId }: { sequenceId: string; stepId: string }) =>
      deleteSequenceStep(sequenceId, stepId),
    onSuccess: (_void, variables) =>
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-detail", variables.sequenceId],
      }),
  });
}

export function useEnrollLeadsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sequenceId,
      leadIds,
      source,
    }: {
      sequenceId: string;
      leadIds: string[];
      source?: EnrollmentSource;
    }) => enrollLeadsInSequence(sequenceId, leadIds, source),
    onSuccess: (_enrollments, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-enrollments", variables.sequenceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-metrics", variables.sequenceId],
      });
    },
  });
}

export function useDisqualifyEnrollmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sequenceId,
      enrollmentId,
      reason,
    }: {
      sequenceId: string;
      enrollmentId: string;
      reason?: string;
    }) => disqualifyEnrollment(sequenceId, enrollmentId, reason),
    onSuccess: (_enrollment, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-enrollments", variables.sequenceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["intergrai", "sequence-metrics", variables.sequenceId],
      });
    },
  });
}

export function useDryRunSequenceMutation() {
  return useMutation({
    mutationFn: (sequenceId: string) => dryRunSequenceEngine(sequenceId),
  });
}

export function useRunSequenceOnceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sequenceId, maxSends }: { sequenceId: string; maxSends?: number }) =>
      runSequenceOnce(sequenceId, maxSends),
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

export type { SequenceStatus };
