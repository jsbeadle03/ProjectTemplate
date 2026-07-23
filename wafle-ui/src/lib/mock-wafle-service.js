const categories = [
  {
    categoryId: 1,
    name: "Tools & Equipment",
    description: "The systems and resources you use every day.",
    requiresResponse: true,
  },
  {
    categoryId: 2,
    name: "Process & Workflow",
    description: "How work moves from idea to done.",
    requiresResponse: true,
  },
  {
    categoryId: 3,
    name: "Management & Communication",
    description: "Clarity, support, and information sharing.",
    requiresResponse: false,
  },
  {
    categoryId: 4,
    name: "Culture & Team",
    description: "Belonging, recognition, and collaboration.",
    requiresResponse: false,
  },
  {
    categoryId: 5,
    name: "Workload & Balance",
    description: "Capacity, focus time, and sustainable work.",
    requiresResponse: false,
  },
  {
    categoryId: 6,
    name: "Compensation & Benefits",
    description: "Pay, benefits, and employee support.",
    requiresResponse: false,
  },
];

let feedback = [
  {
    feedbackId: 1042,
    categoryId: 2,
    categoryName: "Process & Workflow",
    body: "The handoff between design and development has been much smoother since we started using a shared checklist. Could we make it standard for every project?",
    submittedAt: "Today, 9:18 AM",
    upCount: 18,
    downCount: 1,
    status: "Acknowledged",
    moodScore: 4,
    requiresResponse: true,
    response: "",
    actionType: "",
  },
  {
    feedbackId: 1039,
    categoryId: 5,
    categoryName: "Workload & Balance",
    body: "Meeting-free Wednesday mornings have helped a lot. Protecting that time across every team would make focused work much easier.",
    submittedAt: "Yesterday, 3:42 PM",
    upCount: 24,
    downCount: 2,
    status: "Responded",
    moodScore: 3,
    requiresResponse: false,
    response:
      "We are piloting a company-wide focus block next month and will share the schedule on Friday.",
    actionType: "Will do",
  },
  {
    feedbackId: 1034,
    categoryId: 1,
    categoryName: "Tools & Equipment",
    body: "The support team is still sharing two test devices. A small device library would reduce delays when customer issues need to be reproduced.",
    submittedAt: "Monday, 11:06 AM",
    upCount: 15,
    downCount: 0,
    status: "New",
    moodScore: 2,
    requiresResponse: true,
    response: "",
    actionType: "",
  },
  {
    feedbackId: 1028,
    categoryId: 3,
    categoryName: "Management & Communication",
    body: "The shorter Friday update is easier to follow. Posting the decisions and owners afterward would help remote teammates stay aligned.",
    submittedAt: "Jul 20, 4:15 PM",
    upCount: 11,
    downCount: 1,
    status: "Acknowledged",
    moodScore: 4,
    requiresResponse: false,
    response: "",
    actionType: "",
  },
  {
    feedbackId: 1022,
    categoryId: 4,
    categoryName: "Culture & Team",
    body: "The peer shout-outs feel meaningful when they include the impact of the work. Could we add five minutes for them to the monthly all-hands?",
    submittedAt: "Jul 18, 10:30 AM",
    upCount: 21,
    downCount: 3,
    status: "Closed",
    moodScore: 5,
    requiresResponse: false,
    response:
      "Starting in August, every all-hands will close with a five-minute recognition round.",
    actionType: "Will do",
  },
];

let checkedInToday = false;
const reactions = new Map();

const myResponses = [
  {
    feedbackId: 1011,
    categoryName: "Tools & Equipment",
    body: "A second monitor would make reviewing large reports much easier.",
    submittedAt: "Jul 15",
    status: "Responded",
    actionType: "Will do",
    response:
      "Approved. Team leads will collect equipment requests this week and place one combined order.",
  },
  {
    feedbackId: 998,
    categoryName: "Process & Workflow",
    body: "The approval checklist has a duplicate review step that adds a full day.",
    submittedAt: "Jul 8",
    status: "Acknowledged",
    actionType: "Investigating",
    response:
      "Operations is mapping the two review steps now. We will post an update by July 30.",
  },
];

const dashboard = {
  avgMood: 3.9,
  moodChange: "+0.3",
  participationRate: 72,
  participatingUsers: 34,
  eligibleUsers: 47,
  openFeedback: 8,
  responseRate: 83,
  moodTrend: [
    { day: "Thu", value: 3.4 },
    { day: "Fri", value: 3.7 },
    { day: "Sat", value: 3.5 },
    { day: "Sun", value: 3.8 },
    { day: "Mon", value: 4.1 },
    { day: "Tue", value: 3.8 },
    { day: "Wed", value: 3.9 },
  ],
  categories: [
    { name: "Process & Workflow", count: 14, percentage: 88 },
    { name: "Workload & Balance", count: 11, percentage: 69 },
    { name: "Tools & Equipment", count: 9, percentage: 56 },
    { name: "Culture & Team", count: 7, percentage: 44 },
  ],
  privacyNotice:
    "Department breakdown hidden: not enough responses to display.",
};

function wait(result, milliseconds = 180) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(structuredClone(result)), milliseconds);
  });
}

export async function getCategories() {
  return wait(categories);
}

export async function hasCheckedInToday() {
  return wait(checkedInToday);
}

export async function submitMoodCheckIn(moodScore) {
  if (moodScore < 1 || moodScore > 5) {
    throw new Error("Choose a mood from one to five.");
  }
  checkedInToday = true;
  return wait({
    success: true,
    message: "Check-in recorded. Your manager will only see the team trend.",
  });
}

export async function submitFeedback(categoryId, body, moodScore) {
  const category = categories.find(
    (item) => item.categoryId === Number(categoryId),
  );

  if (!category || body.trim().length < 12) {
    throw new Error("Choose a category and share at least 12 characters.");
  }

  feedback = [
    {
      feedbackId: Math.max(...feedback.map((item) => item.feedbackId)) + 1,
      categoryId: category.categoryId,
      categoryName: category.name,
      body: body.trim(),
      submittedAt: "Just now",
      upCount: 0,
      downCount: 0,
      status: "New",
      moodScore: moodScore || null,
      requiresResponse: category.requiresResponse,
      response: "",
      actionType: "",
    },
    ...feedback,
  ];

  return wait({
    success: true,
    message: category.requiresResponse
      ? "Feedback shared. This category requires a manager response."
      : "Feedback shared anonymously.",
  });
}

export async function getPublicFeedbackWall(categoryId = "all") {
  const items =
    categoryId === "all"
      ? feedback
      : feedback.filter((item) => item.categoryId === Number(categoryId));
  return wait(items);
}

export async function reactToFeedback(feedbackId, reaction) {
  const item = feedback.find(
    (entry) => entry.feedbackId === Number(feedbackId),
  );
  if (!item) {
    throw new Error("That feedback item is no longer available.");
  }

  const previous = reactions.get(item.feedbackId);
  if (previous === reaction) {
    return wait(item);
  }

  if (previous === "up") item.upCount -= 1;
  if (previous === "down") item.downCount -= 1;
  if (reaction === "up") item.upCount += 1;
  if (reaction === "down") item.downCount += 1;
  reactions.set(item.feedbackId, reaction);
  return wait(item);
}

export async function getMyResponses() {
  return wait(myResponses);
}

export async function getFeedbackList(
  categoryId = "all",
  keyword = "",
  status = "all",
) {
  const term = keyword.trim().toLowerCase();
  const items = feedback.filter((item) => {
    const categoryMatches =
      categoryId === "all" || item.categoryId === Number(categoryId);
    const statusMatches =
      status === "all" || item.status.toLowerCase() === status;
    const keywordMatches =
      !term ||
      item.body.toLowerCase().includes(term) ||
      item.categoryName.toLowerCase().includes(term);
    return categoryMatches && statusMatches && keywordMatches;
  });
  return wait(items);
}

export async function getFeedbackDetail(feedbackId) {
  const item = feedback.find(
    (entry) => entry.feedbackId === Number(feedbackId),
  );
  return wait(item || null);
}

export async function acknowledgeFeedback(feedbackId) {
  const item = feedback.find(
    (entry) => entry.feedbackId === Number(feedbackId),
  );
  if (!item) throw new Error("Feedback not found.");
  item.status = "Acknowledged";
  return wait(item);
}

export async function respondToFeedback(
  feedbackId,
  actionType,
  responseText,
) {
  const item = feedback.find(
    (entry) => entry.feedbackId === Number(feedbackId),
  );
  if (!item || responseText.trim().length < 12) {
    throw new Error("Choose an action and provide a clear response.");
  }
  item.status = "Responded";
  item.actionType = actionType;
  item.response = responseText.trim();
  return wait(item);
}

export async function getPendingResponses() {
  return wait(
    feedback.filter(
      (item) => item.requiresResponse && item.status !== "Responded",
    ),
  );
}

export async function getDashboard() {
  return wait(dashboard);
}
