export const demoMode =
  import.meta.env.DEV && import.meta.env.VITE_USE_DEMO_DATA === "true";

const sampleLeads = [
  {
    id: "demo-01",
    company: "Northstar Learning",
    contact: "Aarav Mehta",
    role: "Founder",
    email: "aarav@northstar.example",
    website: "northstar.example",
    industry: "Education",
    location: "Bengaluru, India",
    score: 92,
    qualification: "Qualified",
    emailStatus: "Draft generated",
    source: "Uploaded prospect list",
    consent: "Opt-in recorded (demo only)",
    consentEvidence: "Sample signup form (demo only)",
    companyDescription:
      "An illustrative multi-location learning business used to demonstrate the prospect review workflow.",
    summary:
      "A sample education prospect with several locations and an active digital learning program.",
    opportunities: [
      "Coordinate instructor schedules across locations",
      "Reduce manual follow-up during student enrollment",
    ],
    draft: {
      subject: "A smoother way to coordinate learning programs",
      body: "Hi Aarav,\n\nI noticed Northstar Learning is growing its learning programs. Teams managing instructors across locations often find scheduling and enrollment follow-up difficult to keep consistent.\n\nWould you be open to a short conversation about how a connected operations workflow could help?\n\nBest,\nSales Team",
    },
  },
  {
    id: "demo-02",
    company: "Blue Oak Studio",
    contact: "Mira Shah",
    role: "Operations Director",
    email: "mira@blueoak.example",
    website: "blueoak.example",
    industry: "Professional Services",
    location: "Pune, India",
    score: 86,
    qualification: "Qualified",
    emailStatus: "Pending approval",
    source: "Uploaded prospect list",
    consent: "Opt-in recorded (demo only)",
    consentEvidence: "Sample event registration (demo only)",
    companyDescription:
      "A fictional operations studio included to preview lead qualification and email review.",
    summary:
      "A sample services company with a small distributed operations team.",
    opportunities: [
      "Consolidate recurring operational workflows",
      "Improve visibility into team capacity",
    ],
    draft: {
      subject: "An idea for Blue Oak Studio's operations",
      body: "Hi Mira,\n\nI'm reaching out with a practical idea for reducing the coordination work that comes with a growing team. Blue Oak Studio may benefit from a clearer view of recurring work and team capacity.\n\nWould a brief introduction be useful?\n\nBest,\nSales Team",
    },
  },
  {
    id: "demo-03",
    company: "Brightpath Academy",
    contact: "Ishan Rao",
    role: "Managing Director",
    email: "ishan@brightpath.example",
    website: "brightpath.example",
    industry: "Education",
    location: "Hyderabad, India",
    score: 81,
    qualification: "Needs review",
    emailStatus: "Not generated",
    source: "Company website",
    consent: "Consent not verified",
    consentEvidence: "",
    companyDescription:
      "A fictional training provider for demonstrating the needs-review state.",
    summary:
      "A sample academy with public company information but no verified email permission.",
    opportunities: [
      "Confirm relevant buyer and business need",
      "Verify lawful basis and consent before outreach",
    ],
    draft: null,
  },
  {
    id: "demo-04",
    company: "Cedar & Stone",
    contact: "Riya Kapoor",
    role: "Founder",
    email: "riya@cedarstone.example",
    website: "cedarstone.example",
    industry: "Retail",
    location: "Mumbai, India",
    score: 76,
    qualification: "Needs review",
    emailStatus: "Not generated",
    source: "Uploaded prospect list",
    consent: "Consent not verified",
    consentEvidence: "",
    companyDescription:
      "An illustrative retail prospect included to demonstrate qualification filters.",
    summary: "A sample retail business with a growing online storefront.",
    opportunities: ["Verify relevance and contact eligibility"],
    draft: null,
  },
  {
    id: "demo-05",
    company: "Westline Partners",
    contact: "Dev Patel",
    role: "Managing Partner",
    email: "dev@westline.example",
    website: "westline.example",
    industry: "Consulting",
    location: "Delhi, India",
    score: 69,
    qualification: "Rejected",
    emailStatus: "Not generated",
    source: "Company website",
    consent: "Not assessed",
    consentEvidence: "",
    companyDescription:
      "A fictional prospect used to show a rejected qualification state.",
    summary:
      "The sample prospect did not meet the demonstration qualification threshold.",
    opportunities: ["No outreach recommendation"],
    draft: null,
  },
  {
    id: "demo-06",
    company: "Maple Grove Collective",
    contact: "Tara Nair",
    role: "Program Lead",
    email: "tara@maplegrove.example",
    website: "maplegrove.example",
    industry: "Education",
    location: "Chennai, India",
    score: 88,
    qualification: "Qualified",
    emailStatus: "Approved",
    source: "Uploaded prospect list",
    consent: "Opt-in recorded (demo only)",
    consentEvidence: "Sample demo consent (demo only)",
    companyDescription:
      "A sample education group used to demonstrate approved-draft monitoring.",
    summary:
      "A fictional prospect with a pre-approved demo draft for dashboard interactions.",
    opportunities: [
      "Coordinate programs and instructors",
      "Make the enrollment journey easier to manage",
    ],
    draft: {
      subject: "A more connected workflow for Maple Grove",
      body: "Hi Tara,\n\nI wanted to share an idea for bringing program coordination and instructor planning into one easier-to-manage workflow.\n\nIf improving that process is a priority, would a brief conversation be helpful?\n\nBest,\nSales Team",
    },
  },
];

const sampleEvents = [
  {
    id: "event-01",
    company: "Northstar Learning",
    recipient: "aarav@northstar.example",
    subject: "A smoother way to coordinate learning programs",
    date: "Today, 10:42 AM",
    status: "Delivered",
    opened: true,
    clicked: false,
    reply: "Unavailable",
  },
  {
    id: "event-02",
    company: "Blue Oak Studio",
    recipient: "mira@blueoak.example",
    subject: "An idea for Blue Oak Studio's operations",
    date: "Today, 9:18 AM",
    status: "Opened",
    opened: true,
    clicked: true,
    reply: "Unavailable",
  },
  {
    id: "event-03",
    company: "Maple Grove Collective",
    recipient: "tara@maplegrove.example",
    subject: "A more connected workflow for Maple Grove",
    date: "Yesterday, 3:06 PM",
    status: "Bounced",
    opened: false,
    clicked: false,
    reply: "Unavailable",
  },
  {
    id: "event-04",
    company: "Northstar Learning",
    recipient: "aarav@northstar.example",
    subject: "A smoother way to coordinate learning programs",
    date: "Yesterday, 11:15 AM",
    status: "Clicked",
    opened: true,
    clicked: true,
    reply: "Unavailable",
  },
  {
    id: "event-05",
    company: "Blue Oak Studio",
    recipient: "mira@blueoak.example",
    subject: "An idea for Blue Oak Studio's operations",
    date: "Nov 1, 2:30 PM",
    status: "Unsubscribed",
    opened: true,
    clicked: false,
    reply: "Unavailable",
  },
];

const sampleTrends = [
  { day: "Mon", sent: 18, delivered: 16, opened: 9, clicked: 3, bounced: 2 },
  { day: "Tue", sent: 24, delivered: 22, opened: 13, clicked: 5, bounced: 1 },
  { day: "Wed", sent: 21, delivered: 20, opened: 11, clicked: 4, bounced: 1 },
  { day: "Thu", sent: 28, delivered: 26, opened: 16, clicked: 7, bounced: 2 },
  { day: "Fri", sent: 19, delivered: 18, opened: 10, clicked: 4, bounced: 1 },
  { day: "Sat", sent: 11, delivered: 10, opened: 6, clicked: 2, bounced: 1 },
  { day: "Sun", sent: 15, delivered: 14, opened: 8, clicked: 3, bounced: 1 },
];

const sampleSuppressionList = [
  { email: "opted-out@example.test", reason: "Unsubscribed", date: "Nov 1" },
  { email: "invalid-address@example.test", reason: "Hard bounce", date: "Oct 30" },
];

export const demoLeads = demoMode ? sampleLeads : [];
export const demoEvents = demoMode ? sampleEvents : [];
export const demoTrends = demoMode ? sampleTrends : [];
export const demoSuppressionList = demoMode ? sampleSuppressionList : [];
