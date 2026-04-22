// Demo data layer - mimics what Apollo.io API would return.
// Swap functions here with real /api/apollo/* calls when API key is configured.

export type LeadStatus = "new" | "contacted" | "replied" | "interested" | "meeting_booked";
export type CampaignStatus = "active" | "paused" | "completed" | "draft";
export type MeetingStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface Lead {
  id: string;
  name: string;
  company: string;
  title: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  status: LeadStatus;
  campaignId: string;
  campaignName: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  targetIndustry: string;
  targetLocation: string;
  emailsSent: number;
  openRate: number;
  replyRate: number;
  meetingsBooked: number;
  leadsCount: number;
  createdAt: string;
}

export interface Meeting {
  id: string;
  leadName: string;
  leadCompany: string;
  leadTitle: string;
  meetingDate: string;
  status: MeetingStatus;
  notes?: string;
}

export interface Activity {
  id: string;
  message: string;
  type: "lead" | "email" | "reply" | "meeting" | "campaign";
  createdAt: string;
}

export interface ProgressPhase {
  id: string;
  name: string;
  description: string;
  tasks: { title: string; done: boolean }[];
}

export interface Update {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
}

export interface Client {
  id: string;
  companyName: string;
  brandColor: string;
  initials: string;
}

const seedRand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const FIRST = ["Sarah", "James", "Emma", "Michael", "Olivia", "Daniel", "Sophia", "Lucas", "Ava", "Ethan", "Mia", "Noah", "Isabella", "William", "Charlotte", "Benjamin", "Amelia", "Henry", "Harper", "Alexander"];
const LAST = ["Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee"];
const COMPANIES = ["Acme Logistics", "Northwind Capital", "Helix Biotech", "Aperture Robotics", "Vertex Cloud", "Stellar Freight", "Quantum Health", "Pioneer Manufacturing", "Beacon Analytics", "Summit Energy", "Cascade Pharma", "Ironclad Security", "Lumen Realty", "Atlas Industries", "Nimbus AI", "Pegasus Auto", "Orion Defense", "Tundra Foods", "Riverstone Legal", "Maverick Media"];
const TITLES = ["CEO", "Founder", "Chief Operating Officer", "VP of Sales", "Head of Marketing", "Director of Operations", "Chief Revenue Officer", "VP of Engineering", "Head of Growth", "Managing Partner"];
const INDUSTRIES = ["Logistics", "Finance", "Biotech", "Robotics", "Cloud Software", "Healthcare", "Manufacturing", "Energy", "Cybersecurity", "Real Estate", "AI/ML", "Automotive", "Defense", "Food & Bev", "Legal", "Media"];
const LOCATIONS = ["San Francisco, CA", "New York, NY", "Austin, TX", "Boston, MA", "Seattle, WA", "Chicago, IL", "Los Angeles, CA", "Denver, CO", "Miami, FL", "London, UK", "Berlin, DE", "Toronto, CA"];
const STATUSES: LeadStatus[] = ["new", "contacted", "replied", "interested", "meeting_booked"];

export const CLIENTS: Client[] = [
  { id: "client-1", companyName: "Helix Biotech", brandColor: "#7c3aed", initials: "HB" },
  { id: "client-2", companyName: "Vertex Cloud", brandColor: "#0ea5e9", initials: "VC" },
  { id: "client-3", companyName: "Summit Energy", brandColor: "#16a34a", initials: "SE" },
];

export function generateLeads(clientId: string, count = 240): Lead[] {
  const rand = seedRand(clientId.length * 1000 + count);
  const leads: Lead[] = [];
  for (let i = 0; i < count; i++) {
    const first = FIRST[Math.floor(rand() * FIRST.length)];
    const last = LAST[Math.floor(rand() * LAST.length)];
    const company = COMPANIES[Math.floor(rand() * COMPANIES.length)];
    const status = STATUSES[Math.floor(rand() * rand() * STATUSES.length)];
    const daysAgo = Math.floor(rand() * 60);
    leads.push({
      id: `lead-${clientId}-${i}`,
      name: `${first} ${last}`,
      company,
      title: TITLES[Math.floor(rand() * TITLES.length)],
      industry: INDUSTRIES[Math.floor(rand() * INDUSTRIES.length)],
      location: LOCATIONS[Math.floor(rand() * LOCATIONS.length)],
      email: `${first.toLowerCase()}.${last.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, "")}.com`,
      phone: `+1 (${200 + Math.floor(rand() * 700)}) ${100 + Math.floor(rand() * 800)}-${1000 + Math.floor(rand() * 8999)}`,
      status,
      campaignId: `camp-${clientId}-${Math.floor(rand() * 4)}`,
      campaignName: ["Q4 Enterprise Push", "SMB Cold Outreach", "ICP Refresh", "Webinar Follow-up"][Math.floor(rand() * 4)],
      createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    });
  }
  return leads;
}

export function generateCampaigns(clientId: string): Campaign[] {
  const rand = seedRand(clientId.length * 500);
  const names = ["Q4 Enterprise Push", "SMB Cold Outreach", "ICP Refresh", "Webinar Follow-up"];
  const statuses: CampaignStatus[] = ["active", "active", "paused", "completed"];
  return names.map((name, i) => {
    const sent = 800 + Math.floor(rand() * 4000);
    return {
      id: `camp-${clientId}-${i}`,
      name,
      status: statuses[i],
      targetIndustry: INDUSTRIES[Math.floor(rand() * INDUSTRIES.length)],
      targetLocation: LOCATIONS[Math.floor(rand() * LOCATIONS.length)],
      emailsSent: sent,
      openRate: 35 + rand() * 30,
      replyRate: 4 + rand() * 12,
      meetingsBooked: Math.floor(rand() * 25),
      leadsCount: Math.floor(sent * (0.6 + rand() * 0.3)),
      createdAt: new Date(Date.now() - Math.floor(rand() * 90) * 86400000).toISOString(),
    };
  });
}

export function generateMeetings(clientId: string): Meeting[] {
  const rand = seedRand(clientId.length * 700);
  const meetings: Meeting[] = [];
  for (let i = 0; i < 14; i++) {
    const first = FIRST[Math.floor(rand() * FIRST.length)];
    const last = LAST[Math.floor(rand() * LAST.length)];
    const future = i < 6;
    meetings.push({
      id: `meet-${clientId}-${i}`,
      leadName: `${first} ${last}`,
      leadCompany: COMPANIES[Math.floor(rand() * COMPANIES.length)],
      leadTitle: TITLES[Math.floor(rand() * TITLES.length)],
      meetingDate: new Date(Date.now() + (future ? 1 : -1) * Math.floor(rand() * 14) * 86400000).toISOString(),
      status: future ? "scheduled" : (rand() > 0.2 ? "completed" : "no_show"),
    });
  }
  return meetings;
}

export function generateActivity(clientId: string): Activity[] {
  const rand = seedRand(clientId.length * 300);
  const items: { msg: string; type: Activity["type"] }[] = [
    { msg: "New lead added: Sarah Johnson at Acme Logistics", type: "lead" },
    { msg: "Campaign 'Q4 Enterprise Push' sent 412 emails", type: "email" },
    { msg: "Reply received from Michael Davis (Vertex Cloud)", type: "reply" },
    { msg: "Meeting booked with Olivia Brown — Tuesday 2pm", type: "meeting" },
    { msg: "12 new leads imported from Apollo", type: "lead" },
    { msg: "Campaign 'SMB Cold Outreach' resumed", type: "campaign" },
    { msg: "Reply received from James Wilson (Northwind Capital)", type: "reply" },
    { msg: "Sequence step 2 sent to 88 contacts", type: "email" },
    { msg: "Meeting booked with Henry Lopez — Friday 10am", type: "meeting" },
    { msg: "ICP refresh complete: +47 qualified leads", type: "lead" },
  ];
  return items.map((it, i) => ({
    id: `act-${clientId}-${i}`,
    message: it.msg,
    type: it.type,
    createdAt: new Date(Date.now() - i * 3600000 * (1 + rand())).toISOString(),
  }));
}

export function generateLeadsTimeseries(clientId: string) {
  const rand = seedRand(clientId.length * 200);
  const days = 30;
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - i - 1) * 86400000);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      leads: 8 + Math.floor(rand() * 25 + i * 0.5),
      replies: Math.floor(rand() * 6 + i * 0.1),
    };
  });
}

export function generateProgress(): ProgressPhase[] {
  return [
    {
      id: "icp",
      name: "ICP Research",
      description: "Define ideal customer profile and target accounts",
      tasks: [
        { title: "Industry & vertical analysis", done: true },
        { title: "Persona mapping", done: true },
        { title: "Account list build (top 500)", done: true },
        { title: "Competitive positioning review", done: true },
      ],
    },
    {
      id: "setup",
      name: "Lead Setup",
      description: "Apollo configuration and list import",
      tasks: [
        { title: "Apollo workspace configured", done: true },
        { title: "Filters & saved searches", done: true },
        { title: "Initial 2,500 contacts imported", done: true },
        { title: "Email warm-up complete", done: true },
      ],
    },
    {
      id: "launch",
      name: "Campaign Launch",
      description: "Sequences live and sending",
      tasks: [
        { title: "Sequence A copy approved", done: true },
        { title: "Sequence B (follow-up) live", done: true },
        { title: "A/B subject line test running", done: true },
        { title: "Reply handling SOP", done: false },
      ],
    },
    {
      id: "optimize",
      name: "Optimization",
      description: "Iterating on copy, timing, and targeting",
      tasks: [
        { title: "Week 2 reply-rate review", done: true },
        { title: "Refine ICP based on responders", done: false },
        { title: "Add Logistics CEO segment", done: false },
        { title: "Re-test sending windows", done: false },
      ],
    },
    {
      id: "followup",
      name: "Follow-ups",
      description: "Nurture and meeting handoff",
      tasks: [
        { title: "Nurture track for warm leads", done: false },
        { title: "Meeting handoff to AE", done: false },
        { title: "Monthly retro & roadmap", done: false },
      ],
    },
  ];
}

export function generateUpdates(): Update[] {
  return [
    { id: "u1", title: "Added Logistics CEOs to ICP", body: "Expanded targeting to include Logistics CEOs at companies with 200–1,000 employees. First batch of 320 contacts queued for Sequence A.", author: "Alex (Strategy)", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: "u2", title: "Sequence B copy refresh", body: "Rewrote follow-up email 2 to lead with a customer proof-point. Early data shows +1.4% reply lift.", author: "Mira (Copy)", createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: "u3", title: "Pausing under-performing segment", body: "Real Estate vertical replies have dropped below 2%. Pausing for the week and reviewing positioning.", author: "Alex (Strategy)", createdAt: new Date(Date.now() - 9 * 86400000).toISOString() },
    { id: "u4", title: "Apollo data sync schedule", body: "Sync now runs every 6 hours. Next sync at 14:00 UTC.", author: "System", createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  ];
}

export interface KPI {
  totalLeads: number;
  emailsSent: number;
  replies: number;
  meetingsBooked: number;
  weekDelta: { leads: number; replies: number; meetings: number };
}

export function getKPIs(clientId: string): KPI {
  const campaigns = generateCampaigns(clientId);
  const leads = generateLeads(clientId);
  const emailsSent = campaigns.reduce((a, c) => a + c.emailsSent, 0);
  const replies = leads.filter((l) => l.status === "replied" || l.status === "interested" || l.status === "meeting_booked").length;
  const meetingsBooked = leads.filter((l) => l.status === "meeting_booked").length;
  return {
    totalLeads: leads.length,
    emailsSent,
    replies,
    meetingsBooked,
    weekDelta: { leads: 124, replies: 18, meetings: 5 },
  };
}

export function getFunnel(clientId: string) {
  const leads = generateLeads(clientId);
  const total = leads.length;
  const contacted = leads.filter((l) => l.status !== "new").length;
  const replied = leads.filter((l) => ["replied", "interested", "meeting_booked"].includes(l.status)).length;
  const meetings = leads.filter((l) => l.status === "meeting_booked").length;
  return [
    { stage: "Leads", value: total, fill: "var(--chart-1)" },
    { stage: "Contacted", value: contacted, fill: "var(--chart-2)" },
    { stage: "Replied", value: replied, fill: "var(--chart-3)" },
    { stage: "Meetings", value: meetings, fill: "var(--chart-4)" },
  ];
}
