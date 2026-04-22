import { useEffect, useState, useCallback } from "react";
import { generateEmailTemplates, type EmailTemplate } from "./demo-data";

const STORAGE_KEY = "apollo-email-scripts-v1";

interface OverrideState {
  // edits keyed by template id (covers both seed and custom)
  edits: Record<string, Partial<EmailTemplate>>;
  // ids of seed templates the user deleted
  deletedSeedIds: string[];
  // user-created templates
  custom: EmailTemplate[];
}

const EMPTY: OverrideState = { edits: {}, deletedSeedIds: [], custom: [] };

function load(): OverrideState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as OverrideState;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

function save(state: OverrideState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const listeners = new Set<() => void>();
let current: OverrideState = EMPTY;
let initialized = false;

function ensureInit() {
  if (!initialized && typeof window !== "undefined") {
    current = load();
    initialized = true;
  }
}

function emit(next: OverrideState) {
  current = next;
  save(next);
  listeners.forEach((fn) => fn());
}

export function useEmailScripts(clientIds: string[]) {
  ensureInit();
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  // Build the resolved template list across all requested clients
  const seed = clientIds.flatMap((id) => generateEmailTemplates(id));
  const filteredSeed = seed.filter((t) => !current.deletedSeedIds.includes(t.id));
  const customForClients = current.custom.filter((t) => clientIds.includes(t.clientId));
  const merged = [...filteredSeed, ...customForClients].map((t) => {
    const patch = current.edits[t.id];
    return patch ? { ...t, ...patch } : t;
  });

  const addScript = useCallback(
    (input: {
      clientId: string;
      campaignName: string;
      step: number;
      subject: string;
      body: string;
      author?: string;
    }) => {
      const id = `tpl-custom-${Date.now()}`;
      const tpl: EmailTemplate = {
        id,
        clientId: input.clientId,
        campaignName: input.campaignName,
        step: input.step,
        subject: input.subject,
        body: input.body,
        sent: 0,
        opens: 0,
        replies: 0,
        meetings: 0,
        lastEditedAt: new Date().toISOString(),
        author: input.author || "Admin",
      };
      emit({ ...current, custom: [...current.custom, tpl] });
      return tpl;
    },
    [],
  );

  const updateScript = useCallback(
    (id: string, patch: Partial<EmailTemplate>) => {
      const isCustom = current.custom.some((t) => t.id === id);
      const stamped = { ...patch, lastEditedAt: new Date().toISOString() };
      if (isCustom) {
        emit({
          ...current,
          custom: current.custom.map((t) => (t.id === id ? { ...t, ...stamped } : t)),
        });
      } else {
        emit({ ...current, edits: { ...current.edits, [id]: { ...current.edits[id], ...stamped } } });
      }
    },
    [],
  );

  const deleteScript = useCallback((id: string) => {
    const isCustom = current.custom.some((t) => t.id === id);
    if (isCustom) {
      emit({
        ...current,
        custom: current.custom.filter((t) => t.id !== id),
        edits: Object.fromEntries(Object.entries(current.edits).filter(([k]) => k !== id)),
      });
    } else {
      emit({
        ...current,
        deletedSeedIds: [...current.deletedSeedIds, id],
        edits: Object.fromEntries(Object.entries(current.edits).filter(([k]) => k !== id)),
      });
    }
  }, []);

  return { templates: merged, addScript, updateScript, deleteScript };
}
