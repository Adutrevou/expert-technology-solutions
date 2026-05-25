import { createFileRoute } from "@tanstack/react-router";
import { Component, type ErrorInfo, type FormEvent, type ReactNode, useEffect, useState } from "react";

export const Route = createFileRoute("/agent")({
  head: () => ({ meta: [{ title: "Expert Lead Agent - Expert Technology Solutions" }] }),
  component: AgentPage,
});

const API_BASE = (import.meta.env.VITE_LEADS_API_BASE_URL || "https://api.intergrai.co.za").replace(/\/+$/, "");
const CLIENT_SLUG = "expert-technology-solutions";
const CATEGORY_OPTIONS = [
  "new_campaign",
  "campaign_change",
  "lead_question",
  "outreach_draft",
  "support_issue",
] as const;

type Category = (typeof CATEGORY_OPTIONS)[number];

type HistoryItem = {
  id: string;
  title: string;
  message: string;
  category: string;
  status: string;
  createdAt: string;
  createdBy: string;
};

type ReplyItem = {
  id: string;
  message: string;
  createdAt: string;
  author: string;
};

type RequestDetail = HistoryItem & {
  replies: ReplyItem[];
};

function AgentPage() {
  return (
    <AgentPageBoundary>
      <AgentPageContent />
    </AgentPageBoundary>
  );
}

function AgentPageContent() {
  const [category, setCategory] = useState<Category>("lead_question");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<HistoryItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<RequestDetail | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      setListLoading(true);
      setListError("");

      try {
        const response = await fetch(`${API_BASE}/clients/${CLIENT_SLUG}/requests`, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Request history failed (${response.status})`);
        }

        const payload = await response.json();
        const nextRequests = normalizeRequestList(payload);

        if (!active) return;

        setRequests(nextRequests);
        setSelectedRequestId((current) => {
          if (current && nextRequests.some((item) => item.id === current)) {
            return current;
          }
          return nextRequests[0]?.id || "";
        });
      } catch (error) {
        if (!active) return;
        setRequests([]);
        setListError(getErrorMessage(error, "Unable to load request history."));
      } finally {
        if (active) {
          setListLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedRequestId) {
      setSelectedRequest(null);
      setDetailError("");
      return;
    }

    let active = true;

    async function loadRequestDetail() {
      setDetailLoading(true);
      setDetailError("");

      try {
        const response = await fetch(`${API_BASE}/clients/${CLIENT_SLUG}/requests/${selectedRequestId}`, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Request detail failed (${response.status})`);
        }

        const payload = await response.json();
        const nextDetail = normalizeRequestDetail(payload, selectedRequestId);

        if (!active) return;

        setSelectedRequest(nextDetail);
      } catch (error) {
        if (!active) return;
        setSelectedRequest(null);
        setDetailError(getErrorMessage(error, "Unable to load request detail."));
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    }

    void loadRequestDetail();

    return () => {
      active = false;
    };
  }, [selectedRequestId]);

  async function refreshRequests(preferredRequestId?: string) {
    setListError("");

    try {
      const response = await fetch(`${API_BASE}/clients/${CLIENT_SLUG}/requests`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Request history failed (${response.status})`);
      }

      const payload = await response.json();
      const nextRequests = normalizeRequestList(payload);
      setRequests(nextRequests);

      if (preferredRequestId && nextRequests.some((item) => item.id === preferredRequestId)) {
        setSelectedRequestId(preferredRequestId);
        return;
      }

      setSelectedRequestId((current) => {
        if (current && nextRequests.some((item) => item.id === current)) {
          return current;
        }
        return nextRequests[0]?.id || "";
      });
    } catch (error) {
      setListError(getErrorMessage(error, "Unable to refresh request history."));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    const trimmedMessage = message.trim();
    const trimmedTitle = title.trim();

    if (!trimmedMessage) {
      setSubmitError("Message is required.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/clients/${CLIENT_SLUG}/requests`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          title: trimmedTitle || undefined,
          message: trimmedMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Submit failed (${response.status})`);
      }

      const payload = await response.json();
      const createdRequestId = getCreatedRequestId(payload);

      setTitle("");
      setMessage("");
      setCategory("lead_question");
      setSubmitSuccess("Request submitted successfully.");

      await refreshRequests(createdRequestId);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Unable to submit request."));
    } finally {
      setSubmitting(false);
    }
  }

  const safeSelectedRequest = selectedRequest || getFallbackDetail(requests, selectedRequestId);
  const safeReplies = safeSelectedRequest?.replies || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-600">Powered by Intergrai</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Expert Lead Agent</h1>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Internal preview notice. This page is a minimal go-live fallback and is intentionally hidden from normal
          navigation.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create request</h2>
          <p className="mt-1 text-sm text-slate-600">Submits directly to the public Intergrai client request API.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="agent-category">
                Category
              </label>
              <select
                id="agent-category"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                value={category}
                onChange={(event) => setCategory(toCategory(event.target.value))}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="agent-title">
                Title
              </label>
              <input
                id="agent-title"
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Short summary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="agent-message">
                Message
              </label>
              <textarea
                id="agent-message"
                className="min-h-40 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe the request"
              />
            </div>

            {submitError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}

            {submitSuccess ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {submitSuccess}
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Request history</h2>
                <p className="mt-1 text-sm text-slate-600">Latest requests for this client.</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  void refreshRequests(selectedRequestId || undefined);
                }}
              >
                Refresh
              </button>
            </div>

            {listError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {listError}
              </div>
            ) : null}

            {listLoading ? <p className="mt-4 text-sm text-slate-500">Loading requests...</p> : null}

            {!listLoading && requests.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No requests found.</p>
            ) : null}

            <ul className="mt-4 space-y-3">
              {requests.map((request) => {
                const isSelected = request.id === selectedRequestId;

                return (
                  <li key={request.id}>
                    <button
                      type="button"
                      className={`w-full rounded-xl border px-4 py-3 text-left ${
                        isSelected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                      onClick={() => setSelectedRequestId(request.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{request.title || "Untitled request"}</p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{request.category}</p>
                        </div>
                        <span className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600">
                          {request.status || "unknown"}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{request.message || "No message provided."}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDateTime(request.createdAt)}{request.createdBy ? ` • ${request.createdBy}` : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Selected request detail</h2>
            <p className="mt-1 text-sm text-slate-600">Replies are shown when the public API provides them.</p>

            {detailError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {detailError}
              </div>
            ) : null}

            {detailLoading ? <p className="mt-4 text-sm text-slate-500">Loading request detail...</p> : null}

            {!detailLoading && !safeSelectedRequest ? (
              <p className="mt-4 text-sm text-slate-500">Select a request to view detail.</p>
            ) : null}

            {safeSelectedRequest ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {safeSelectedRequest.title || "Untitled request"}
                    </h3>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                      {safeSelectedRequest.status || "unknown"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{safeSelectedRequest.category || "uncategorized"}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">
                    {safeSelectedRequest.message || "No message provided."}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    {formatDateTime(safeSelectedRequest.createdAt)}
                    {safeSelectedRequest.createdBy ? ` • ${safeSelectedRequest.createdBy}` : ""}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Replies</h3>
                  {safeReplies.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No replies available.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {safeReplies.map((reply) => (
                        <li key={reply.id} className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="whitespace-pre-wrap text-sm text-slate-800">{reply.message || "Empty reply."}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            {formatDateTime(reply.createdAt)}{reply.author ? ` • ${reply.author}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeRequestList(payload: unknown): HistoryItem[] {
  const source = getObject(payload);
  const list = getArray(source.requests) || getArray(source.data) || [];
  return list.map((item, index) => normalizeHistoryItem(item, index)).filter((item): item is HistoryItem => Boolean(item));
}

function normalizeRequestDetail(payload: unknown, fallbackId: string): RequestDetail {
  const source = getObject(payload);
  const requestSource = getObject(source.request) || source;
  const base = normalizeHistoryItem(requestSource, 0, fallbackId) || emptyHistoryItem(fallbackId);
  const repliesSource = getArray(requestSource.replies) || getArray(source.replies) || [];

  return {
    ...base,
    replies: repliesSource
      .map((item, index) => normalizeReplyItem(item, index))
      .filter((item): item is ReplyItem => Boolean(item)),
  };
}

function normalizeHistoryItem(item: unknown, index: number, fallbackId?: string): HistoryItem | null {
  const source = getObject(item);
  if (!source) return null;

  const id = getString(source.id) || getString(source.request_id) || fallbackId || `request-${index}`;

  return {
    id,
    title: getString(source.title) || getString(source.subject) || "",
    message: getString(source.message) || getString(source.description) || "",
    category: getString(source.category) || "unknown",
    status: getString(source.status) || "unknown",
    createdAt: getString(source.created_at) || getString(source.createdAt) || "",
    createdBy:
      getString(source.created_by_name) ||
      getString(source.createdByName) ||
      getString(source.created_by_email) ||
      getString(source.createdByEmail) ||
      "",
  };
}

function normalizeReplyItem(item: unknown, index: number): ReplyItem | null {
  const source = getObject(item);
  if (!source) return null;

  return {
    id: getString(source.id) || getString(source.reply_id) || `reply-${index}`,
    message: getString(source.message) || getString(source.body) || "",
    createdAt: getString(source.created_at) || getString(source.createdAt) || "",
    author:
      getString(source.author_name) ||
      getString(source.authorName) ||
      getString(source.created_by_name) ||
      getString(source.createdByName) ||
      "",
  };
}

function getCreatedRequestId(payload: unknown): string | undefined {
  const source = getObject(payload);
  const requestSource = getObject(source.request) || source;
  return getString(requestSource.id) || getString(requestSource.request_id) || undefined;
}

function getFallbackDetail(requests: HistoryItem[], selectedRequestId: string): RequestDetail | null {
  const match = requests.find((request) => request.id === selectedRequestId);
  if (!match) return null;
  return { ...match, replies: [] };
}

function emptyHistoryItem(id: string): HistoryItem {
  return {
    id,
    title: "",
    message: "",
    category: "unknown",
    status: "unknown",
    createdAt: "",
    createdBy: "",
  };
}

function toCategory(value: string): Category {
  return CATEGORY_OPTIONS.includes(value as Category) ? (value as Category) : "lead_question";
}

function getObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDateTime(value: string): string {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

class AgentPageBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error?.message || "Agent page failed to render.",
    };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <h1 className="text-xl font-semibold">Expert Lead Agent</h1>
            <p className="mt-2 text-sm font-medium">Powered by Intergrai</p>
            <p className="mt-4 text-sm">{this.state.message || "This page encountered a render error."}</p>
            <p className="mt-2 text-sm">Refresh the page or return later. This fallback keeps the rest of the app usable.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
