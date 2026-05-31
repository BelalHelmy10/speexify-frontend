export const PLACEMENT_VERSION = "speexify-placement-v1";

export const WRITING_TASK =
  "Your company is considering whether to offer English coaching to employees. Write a message to a manager explaining why this could be useful, what problems it should solve, and how success should be measured after three months.";

export const SPEAKING_PROMPT =
  "Speak for 60-90 seconds: Describe a professional situation where you need better English. Explain the context, the problem, and what successful communication would sound like.";

export const CORE_ITEMS = [
  { id: "c1", level: "A1", prompt: "Maria ___ from Brazil.", options: ["are", "is", "be", "am"], answer: 1 },
  { id: "c2", level: "A1", prompt: "I usually have coffee ___ the morning.", options: ["in", "on", "at", "to"], answer: 0 },
  { id: "c3", level: "A1", prompt: "Choose the correct question.", options: ["Where you live?", "Where do you live?", "Where are live you?", "Where does you live?"], answer: 1 },
  { id: "c4", level: "A1", prompt: "There ___ two emails in my inbox.", options: ["is", "are", "has", "be"], answer: 1 },
  { id: "c5", level: "A2", prompt: "We ___ the client yesterday afternoon.", options: ["meet", "met", "have met", "meeting"], answer: 1 },
  { id: "c6", level: "A2", prompt: "This report is ___ than the first version.", options: ["clear", "clearest", "clearer", "more clear than"], answer: 2 },
  { id: "c7", level: "A2", prompt: "You ___ bring your passport to the interview. It is required.", options: ["should", "may", "can", "could"], answer: 0 },
  { id: "c8", level: "A2", prompt: "I have ___ time before the meeting, so I can help.", options: ["a few", "a little", "many", "any"], answer: 1 },
  { id: "c9", level: "B1", prompt: "I ___ in this role for three years.", options: ["work", "worked", "have worked", "am working"], answer: 2 },
  { id: "c10", level: "B1", prompt: "If the supplier lowers the price, we ___ the contract.", options: ["signed", "would sign", "will sign", "signing"], answer: 2 },
  { id: "c11", level: "B1", prompt: "The training materials ___ by the end of the week.", options: ["will send", "will be sent", "will have send", "will be sending"], answer: 1 },
  { id: "c12", level: "B1", prompt: "Choose the best synonym for 'delay' in a business context.", options: ["postpone", "increase", "approve", "compare"], answer: 0 },
  { id: "c13", level: "B2", prompt: "She ___ have misunderstood the brief; her proposal answers a different problem.", options: ["must", "should", "would", "can"], answer: 0 },
  { id: "c14", level: "B2", prompt: "The presentation was effective, ___ it could have used stronger evidence.", options: ["despite", "although", "however", "therefore"], answer: 1 },
  { id: "c15", level: "B2", prompt: "If we had tested the feature earlier, we ___ the launch.", options: ["would not delay", "will not have delayed", "would not have delayed", "had not delayed"], answer: 2 },
  { id: "c16", level: "B2", prompt: "Choose the most natural collocation.", options: ["make a decision", "do a decision", "take a decisioning", "build a decision"], answer: 0 },
  { id: "c17", level: "C1", prompt: "No sooner ___ the figures than the finance director questioned the forecast.", options: ["we presented", "had we presented", "we had presented", "did we presented"], answer: 1 },
  { id: "c18", level: "C1", prompt: "The proposal is sound, but its assumptions require further ___.", options: ["scrutiny", "glance", "sight", "notice"], answer: 0 },
  { id: "c19", level: "C1", prompt: "Choose the sentence with the clearest emphasis.", options: ["What concerns me is the timeline, not the budget.", "The timeline concerns me is what, not the budget.", "It concerns me what the timeline is not the budget.", "The budget not the timeline what concerns me."], answer: 0 },
  { id: "c20", level: "C1", prompt: "The manager's feedback was constructive, if somewhat ___.", options: ["blunt", "blunted", "bluntly", "bluntness"], answer: 0 },
  { id: "c21", level: "C2", prompt: "The report avoids sensationalism and gives a ___ account of the incident.", options: ["measured", "measurable", "measuring", "measurement"], answer: 0 },
  { id: "c22", level: "C2", prompt: "Choose the most precise completion: The CEO's remarks were not wrong, but they were politically ___.", options: ["naive", "naively", "naivety", "naiver"], answer: 0 },
  { id: "c23", level: "C2", prompt: "Which phrase best means 'to reduce the intensity of criticism'?", options: ["temper criticism", "template criticism", "tamper criticism", "tender criticism"], answer: 0 },
  { id: "c24", level: "C2", prompt: "The board approved the strategy, ___ reservations about execution risk.", options: ["notwithstanding", "whereas", "inasmuch", "lest"], answer: 0 },
];

export const READING_PASSAGES = [
  {
    id: "r1",
    title: "A new meeting policy",
    text: "A software company noticed that employees were spending more than half of their working week in meetings. Managers believed the meetings improved alignment, but engineers said they had too little uninterrupted time for complex work. The company introduced a policy: no internal meetings before 11 a.m., all recurring meetings must have an owner, and every meeting invitation must include a decision or outcome. After six weeks, employees reported fewer interruptions, but some cross-team decisions took longer because informal conversations had also decreased.",
    questions: [
      { id: "r1q1", prompt: "What problem did the company want to solve?", options: ["Too many customer calls", "Too much meeting time", "Too few managers", "Too much remote work"], answer: 1 },
      { id: "r1q2", prompt: "What was required for every meeting invitation?", options: ["A recording link", "A list of all engineers", "A decision or outcome", "A customer quote"], answer: 2 },
      { id: "r1q3", prompt: "Which result was negative?", options: ["Employees felt more interrupted", "Some decisions became slower", "Meetings became longer", "Engineers stopped attending meetings"], answer: 1 },
      { id: "r1q4", prompt: "The best title for this passage is:", options: ["How to remove all meetings", "A policy with benefits and trade-offs", "Why engineers dislike managers", "The end of teamwork"], answer: 1 },
    ],
  },
  {
    id: "r2",
    title: "Learning under pressure",
    text: "Adults often judge their language progress by how they perform in high-pressure situations: a negotiation, an interview, or a presentation. This can be misleading. A learner may communicate effectively in class but freeze in front of senior colleagues. The problem is not always language knowledge. It may be cognitive load: the speaker is managing ideas, audience reactions, time, confidence, and grammar at the same time. Effective coaching therefore combines language work with rehearsal, feedback, and realistic constraints.",
    questions: [
      { id: "r2q1", prompt: "Why can high-pressure situations be misleading?", options: ["They test only vocabulary", "They may hide what learners can do in calmer settings", "They are always easier than class", "They remove audience reactions"], answer: 1 },
      { id: "r2q2", prompt: "What does 'cognitive load' refer to here?", options: ["The number of books a learner reads", "The mental effort of managing many demands at once", "A grammar rule for conditionals", "A learner's accent"], answer: 1 },
      { id: "r2q3", prompt: "What does the passage imply about good coaching?", options: ["It should focus only on grammar drills", "It should avoid difficult situations", "It should include realistic practice", "It should replace feedback with tests"], answer: 2 },
      { id: "r2q4", prompt: "The writer's tone is best described as:", options: ["practical and analytical", "angry and dismissive", "comic", "uncertain"], answer: 0 },
    ],
  },
  {
    id: "r3",
    title: "The limits of fluency",
    text: "Fluency is often treated as speed, but speed alone is a shallow measure. A speaker who talks quickly may still be vague, repetitive, or difficult to follow. In professional communication, fluency also includes control: the ability to organize a message, signal transitions, respond to objections, and choose an appropriate level of directness. At advanced levels, the strongest speakers are not always the fastest; they are the ones who make complex ideas easy for others to process.",
    questions: [
      { id: "r3q1", prompt: "What is the main argument?", options: ["Fast speech is always best", "Fluency is more than speed", "Advanced speakers should use complex words", "Professional communication avoids objections"], answer: 1 },
      { id: "r3q2", prompt: "Which skill is included in professional fluency?", options: ["Speaking without pauses at any cost", "Choosing appropriate directness", "Memorizing scripts", "Using the longest possible words"], answer: 1 },
      { id: "r3q3", prompt: "The word 'shallow' is closest in meaning to:", options: ["incomplete", "deep", "accurate", "formal"], answer: 0 },
      { id: "r3q4", prompt: "According to the passage, the strongest advanced speakers:", options: ["never simplify ideas", "make complex ideas easier to process", "avoid transitions", "speak as quickly as possible"], answer: 1 },
    ],
  },
];

export const LISTENING_ITEMS = [
  {
    id: "l1",
    title: "Card replacement call",
    audioSrc: "/audio/placement/card-replacement.wav",
    duration: "45 sec",
    sourceNote: "Real two-person call recording",
    questions: [
      { id: "l1q1", prompt: "What did the caller lose?", options: ["A debit card", "A credit card", "A checkbook", "An account password"], answer: 1 },
      { id: "l1q2", prompt: "When should the replacement arrive?", options: ["Today", "Tomorrow morning", "In three to five business days", "Next month"], answer: 2 },
      { id: "l1q3", prompt: "What does the agent ask near the end?", options: ["Whether the caller wants anything else", "Whether the caller wants to open a loan", "Whether the caller can visit a branch", "Whether the caller knows the account balance"], answer: 0 },
    ],
  },
  {
    id: "l2",
    title: "Balance check call",
    audioSrc: "/audio/placement/balance-check.wav",
    duration: "35 sec",
    sourceNote: "Real two-person call recording",
    questions: [
      { id: "l2q1", prompt: "Why does the caller contact the bank?", options: ["To replace a card", "To check an account balance", "To pay a bill", "To schedule an appointment"], answer: 1 },
      { id: "l2q2", prompt: "Which account does the caller ask about?", options: ["Checking", "Savings", "Credit card", "Mortgage"], answer: 1 },
      { id: "l2q3", prompt: "What balance does the agent give?", options: ["$60", "$106", "$160", "$600"], answer: 1 },
    ],
  },
  {
    id: "l3",
    title: "Bill payment call",
    audioSrc: "/audio/placement/bill-payment.wav",
    duration: "1 min 32 sec",
    sourceNote: "Real two-person call recording with natural phone-line noise",
    questions: [
      { id: "l3q1", prompt: "What does the caller want to do?", options: ["Pay a bill", "Transfer money", "Reset a password", "Order checks"], answer: 0 },
      { id: "l3q2", prompt: "What street address is given for the company?", options: ["627 First Street", "672 First Street", "762 Main Street", "276 Main Street"], answer: 1 },
      { id: "l3q3", prompt: "How much is the bill?", options: ["$117", "$127", "$147", "$174"], answer: 2 },
    ],
  },
];

export const SPEAKING_CHECKS = [
  {
    id: "s1",
    label: "Fluency under pressure",
    options: [
      "I can only answer with single words or memorized phrases.",
      "I can answer simple familiar questions with pauses.",
      "I can describe routine situations and recover from some pauses.",
      "I can explain opinions and keep going even when I need time.",
      "I can handle follow-up questions and adjust my answer clearly.",
      "I can speak naturally, precisely, and persuasively in complex situations.",
    ],
  },
  {
    id: "s2",
    label: "Interaction",
    options: [
      "I need the other person to speak very slowly and help a lot.",
      "I can manage predictable exchanges if the topic is familiar.",
      "I can participate in normal conversations about work and life.",
      "I can negotiate meaning, clarify, and repair misunderstandings.",
      "I can challenge, persuade, and respond diplomatically.",
      "I can adapt tone and strategy almost like a highly skilled professional speaker.",
    ],
  },
  {
    id: "s3",
    label: "Range of expression",
    options: [
      "I use isolated words and basic phrases.",
      "I use simple sentences about familiar topics.",
      "I can connect ideas with because, but, so, and when.",
      "I can explain causes, consequences, advantages, and risks.",
      "I can use nuanced language for uncertainty, emphasis, and diplomacy.",
      "I can express subtle distinctions with precision and flexibility.",
    ],
  },
  {
    id: "s4",
    label: "Pronunciation and clarity",
    options: [
      "Listeners often cannot understand me.",
      "Listeners understand me when I repeat or slow down.",
      "Listeners usually understand me, though some sounds cause difficulty.",
      "My pronunciation is clear enough for professional conversations.",
      "I can use stress, pausing, and intonation to guide the listener.",
      "My delivery supports meaning, emphasis, and relationship-building.",
    ],
  },
];

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toIndex(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function summarizeQuestions(questions) {
  const total = questions.length;
  const correct = questions.filter((question) => question.isCorrect).length;
  const answered = questions.filter((question) => question.selectedIndex !== null).length;
  return { total, correct, answered };
}

function buildQuestionReview(question, answers) {
  const selectedIndex = toIndex(answers[question.id]);
  return {
    ...question,
    selectedIndex,
    selectedOption: selectedIndex !== null ? question.options[selectedIndex] || null : null,
    correctOption: question.options[question.answer] || null,
    isCorrect: selectedIndex === question.answer,
    wasAnswered: selectedIndex !== null,
  };
}

export function buildPlacementReview(reviewMeta) {
  const meta = asObject(reviewMeta);
  const answers = asObject(meta.answers);
  const placementResult = asObject(meta.placementResult);
  const coreAnswers = asObject(answers.coreAnswers);
  const readingAnswers = asObject(answers.readingAnswers);
  const listeningAnswers = asObject(answers.listeningAnswers);
  const speakingAnswers = asObject(answers.speakingChecks);

  const languageQuestions = CORE_ITEMS.map((question) =>
    buildQuestionReview(question, coreAnswers)
  );

  const readingGroups = READING_PASSAGES.map((passage) => {
    const questions = passage.questions.map((question) =>
      buildQuestionReview(question, readingAnswers)
    );
    return { ...passage, questions, summary: summarizeQuestions(questions) };
  });

  const listeningGroups = LISTENING_ITEMS.map((item) => {
    const questions = item.questions.map((question) =>
      buildQuestionReview(question, listeningAnswers)
    );
    return { ...item, questions, summary: summarizeQuestions(questions) };
  });

  const speakingChecks = SPEAKING_CHECKS.map((check) => {
    const selectedIndex = toIndex(speakingAnswers[check.id]);
    return {
      ...check,
      selectedIndex,
      selectedOption: selectedIndex !== null ? check.options[selectedIndex] || null : null,
      wasAnswered: selectedIndex !== null,
    };
  });

  return {
    hasFullAttempt: Boolean(meta.answers),
    placementVersion: meta.placementVersion || placementResult.version || "",
    completedAt: meta.completedAt || "",
    placementResult,
    languageUse: {
      title: "Language use",
      questions: languageQuestions,
      summary: summarizeQuestions(languageQuestions),
    },
    readingGroups,
    listeningGroups,
    speaking: {
      prompt: SPEAKING_PROMPT,
      seconds: Number(meta.speakingSeconds ?? placementResult?.raw?.speaking?.seconds ?? 0),
      checks: speakingChecks,
    },
    writing: {
      prompt: WRITING_TASK,
      metrics: placementResult?.raw?.writing?.metrics || null,
    },
  };
}
