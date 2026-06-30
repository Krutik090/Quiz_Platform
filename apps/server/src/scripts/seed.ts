/**
 * Idempotent dev-only seeder: creates a Super Admin account, a couple of dummy quizzes
 * spanning most question types, and one ready-to-join demo event in the lobby.
 *
 * Usage: npm run seed --workspace=apps/server   (or `npm run seed` from apps/server)
 */
import argon2 from "argon2";
import { nanoid } from "nanoid";
import { QuestionType, QuizStatus, EventStatus, Role, type Question, type ScoringConfig } from "@tribastion/shared";
import { connectMongo, disconnectMongo } from "@/lib/mongo";
import { logger } from "@/lib/logger";
import { AdminUserModel } from "@/modules/auth/auth.model";
import { QuizModel } from "@/modules/quiz/quiz.model";
import { QuizEventModel } from "@/modules/event/event.model";
import { ParticipantModel } from "@/modules/participant/participant.model";

const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const SEED_ADMIN_EMAIL = "admin@tribastion.dev";
export const SEED_ADMIN_PASSWORD = "TribastionAdmin!23";
const DEMO_JOIN_CODE = "DEMO23";

const scoring = (overrides: Partial<ScoringConfig> = {}): ScoringConfig => ({
  basePoints: 1000,
  speedBonus: true,
  negativeMarkingMultiplier: 0,
  partialCreditEnabled: false,
  ...overrides,
});

function id() {
  return nanoid(10);
}

function generalKnowledgeQuestions(): Question[] {
  return [
    {
      id: id(),
      type: QuestionType.SINGLE_CHOICE,
      prompt: "What is the capital of France?",
      timeLimitSeconds: 20,
      points: 1000,
      scoring: scoring(),
      order: 0,
      required: true,
      randomizeOptions: false,
      options: [
        { id: id(), text: "Berlin", isCorrect: false },
        { id: id(), text: "Paris", isCorrect: true },
        { id: id(), text: "Madrid", isCorrect: false },
        { id: id(), text: "Rome", isCorrect: false },
      ],
    },
    {
      id: id(),
      type: QuestionType.MULTIPLE_CHOICE,
      prompt: "Which of these are prime numbers?",
      timeLimitSeconds: 25,
      points: 1000,
      scoring: scoring({ partialCreditEnabled: true }),
      order: 1,
      required: true,
      randomizeOptions: true,
      options: [
        { id: id(), text: "2", isCorrect: true },
        { id: id(), text: "3", isCorrect: true },
        { id: id(), text: "4", isCorrect: false },
        { id: id(), text: "9", isCorrect: false },
      ],
    },
    {
      id: id(),
      type: QuestionType.TRUE_FALSE,
      prompt: "The Great Wall of China is visible from space with the naked eye.",
      timeLimitSeconds: 15,
      points: 800,
      scoring: scoring({ negativeMarkingMultiplier: 0.25 }),
      order: 2,
      required: true,
      correctAnswer: false,
    },
    {
      id: id(),
      type: QuestionType.FILL_IN_BLANK,
      prompt: "The chemical symbol for gold is ____.",
      timeLimitSeconds: 20,
      points: 1000,
      scoring: scoring(),
      order: 3,
      required: true,
      caseSensitive: false,
      acceptedAnswers: ["Au"],
    },
    {
      id: id(),
      type: QuestionType.NUMERIC,
      prompt: "How many continents are there on Earth?",
      timeLimitSeconds: 15,
      points: 800,
      scoring: scoring(),
      order: 4,
      required: true,
      correctValue: 7,
      tolerance: 0,
    },
    {
      id: id(),
      type: QuestionType.ORDERING,
      prompt: "Order these planets from closest to farthest from the Sun.",
      timeLimitSeconds: 30,
      points: 1200,
      scoring: scoring({ partialCreditEnabled: true }),
      order: 5,
      required: true,
      items: [
        { id: id(), text: "Mercury", correctPosition: 0 },
        { id: id(), text: "Venus", correctPosition: 1 },
        { id: id(), text: "Earth", correctPosition: 2 },
        { id: id(), text: "Mars", correctPosition: 3 },
      ],
    },
    {
      id: id(),
      type: QuestionType.MATCHING,
      prompt: "Match each country to its capital.",
      timeLimitSeconds: 30,
      points: 1200,
      scoring: scoring({ partialCreditEnabled: true }),
      order: 6,
      required: true,
      pairs: [
        { id: id(), left: "Japan", right: "Tokyo" },
        { id: id(), left: "Canada", right: "Ottawa" },
        { id: id(), left: "Egypt", right: "Cairo" },
      ],
    },
    {
      id: id(),
      type: QuestionType.RATING,
      prompt: "How would you rate this quiz so far?",
      timeLimitSeconds: 15,
      points: 0,
      scoring: scoring({ basePoints: 0, speedBonus: false }),
      order: 7,
      required: false,
      minValue: 1,
      maxValue: 5,
      step: 1,
    },
    {
      id: id(),
      type: QuestionType.POLL,
      prompt: "Which topic should we cover next?",
      timeLimitSeconds: 20,
      points: 0,
      scoring: scoring({ basePoints: 0, speedBonus: false }),
      order: 8,
      required: false,
      randomizeOptions: false,
      options: [
        { id: id(), text: "Science" },
        { id: id(), text: "History" },
        { id: id(), text: "Technology" },
      ],
    },
    {
      id: id(),
      type: QuestionType.OPEN_TEXT,
      prompt: "What did you enjoy most about this quiz?",
      timeLimitSeconds: 30,
      points: 0,
      scoring: scoring({ basePoints: 0, speedBonus: false }),
      order: 9,
      required: false,
      maxLength: 300,
    },
  ];
}

function webDevTriviaQuestions(): Question[] {
  return [
    {
      id: id(),
      type: QuestionType.SINGLE_CHOICE,
      prompt: "Which hook lets you persist state across renders in React?",
      timeLimitSeconds: 20,
      points: 1000,
      scoring: scoring(),
      order: 0,
      required: true,
      randomizeOptions: false,
      options: [
        { id: id(), text: "useEffect", isCorrect: false },
        { id: id(), text: "useState", isCorrect: true },
        { id: id(), text: "useRef", isCorrect: false },
        { id: id(), text: "useMemo", isCorrect: false },
      ],
    },
    {
      id: id(),
      type: QuestionType.TRUE_FALSE,
      prompt: "TypeScript compiles directly to machine code.",
      timeLimitSeconds: 15,
      points: 800,
      scoring: scoring(),
      order: 1,
      required: true,
      correctAnswer: false,
    },
    {
      id: id(),
      type: QuestionType.MULTIPLE_CHOICE,
      prompt: "Which of these are valid HTTP methods?",
      timeLimitSeconds: 20,
      points: 1000,
      scoring: scoring({ partialCreditEnabled: true }),
      order: 2,
      required: true,
      randomizeOptions: true,
      options: [
        { id: id(), text: "GET", isCorrect: true },
        { id: id(), text: "PATCH", isCorrect: true },
        { id: id(), text: "FETCH", isCorrect: false },
        { id: id(), text: "POST", isCorrect: true },
      ],
    },
    {
      id: id(),
      type: QuestionType.FILL_IN_BLANK,
      prompt: "Redis primarily stores data in ____.",
      timeLimitSeconds: 20,
      points: 900,
      scoring: scoring(),
      order: 3,
      required: true,
      caseSensitive: false,
      acceptedAnswers: ["memory", "RAM"],
    },
  ];
}

async function seedAdmin() {
  const existing = await AdminUserModel.findOne({ email: SEED_ADMIN_EMAIL });
  if (existing) {
    logger.info("Admin user already exists — skipping");
    return existing;
  }

  const passwordHash = await argon2.hash(SEED_ADMIN_PASSWORD, ARGON2_OPTIONS);
  const admin = await AdminUserModel.create({
    email: SEED_ADMIN_EMAIL,
    name: "Super Admin",
    passwordHash,
    role: Role.SUPER_ADMIN,
    isActive: true,
    mfaEnabled: false,
  });
  logger.info({ email: SEED_ADMIN_EMAIL }, "Created super admin");
  return admin;
}

async function seedQuizzes(ownerId: string) {
  const existingCount = await QuizModel.countDocuments({ ownerId });
  if (existingCount > 0) {
    logger.info("Quizzes already seeded — skipping");
    return QuizModel.find({ ownerId }).exec();
  }

  const docs = await QuizModel.insertMany([
    {
      title: "General Knowledge Mix",
      description: "A demo quiz covering most question types — single/multiple choice, true/false, fill-in-blank, numeric, ordering, matching, rating, poll, and open text.",
      ownerId,
      status: QuizStatus.PUBLISHED,
      tags: ["demo", "general-knowledge"],
      questions: generalKnowledgeQuestions(),
      settings: {
        randomizeQuestions: false,
        randomizeAnswers: false,
        showLeaderboardAfterEachQuestion: true,
        leaderboardDurationSeconds: 8,
        allowLateJoin: false,
        defaultTimeLimitSeconds: 20,
        theme: { primaryColor: "#EC008C" },
      },
    },
    {
      title: "Web Dev Trivia",
      description: "Quick trivia quiz for developers.",
      ownerId,
      status: QuizStatus.PUBLISHED,
      tags: ["demo", "tech"],
      questions: webDevTriviaQuestions(),
      settings: {
        randomizeQuestions: false,
        randomizeAnswers: false,
        showLeaderboardAfterEachQuestion: true,
        leaderboardDurationSeconds: 6,
        allowLateJoin: true,
        defaultTimeLimitSeconds: 20,
        theme: { primaryColor: "#EC008C" },
      },
    },
  ]);

  logger.info({ count: docs.length }, "Created dummy quizzes");
  return docs;
}

async function seedDemoEvent(ownerId: string, quiz: { id: string; questions: Question[]; settings: Record<string, unknown> }) {
  const existing = await QuizEventModel.findOne({ joinCode: DEMO_JOIN_CODE });
  if (existing) {
    logger.info({ joinCode: DEMO_JOIN_CODE }, "Demo event already seeded — skipping");
    return existing;
  }

  const event = await QuizEventModel.create({
    quizId: quiz.id,
    hostId: ownerId,
    joinCode: DEMO_JOIN_CODE,
    status: EventStatus.LOBBY,
    currentQuestionIndex: -1,
    questionOrder: quiz.questions.map((q) => q.id),
    questionsSnapshot: quiz.questions,
    settingsSnapshot: quiz.settings,
  });

  await ParticipantModel.insertMany([
    { eventId: event.id, username: "Alex", email: "alex@example.com", avatar: "fox", isConnected: false },
    { eventId: event.id, username: "Sam", email: "sam@example.com", avatar: "panda", isConnected: false },
  ]);

  logger.info({ joinCode: DEMO_JOIN_CODE, eventId: event.id }, "Created demo lobby event with 2 sample participants");
  return event;
}

async function main() {
  await connectMongo();

  const admin = await seedAdmin();
  const quizzes = await seedQuizzes(admin.id);
  const firstQuiz = quizzes[0];
  if (firstQuiz) {
    await seedDemoEvent(admin.id, {
      id: firstQuiz.id,
      questions: firstQuiz.questions as unknown as Question[],
      settings: firstQuiz.settings as unknown as Record<string, unknown>,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`
Seed complete.

  Admin login
    URL:      http://localhost:5173/login
    Email:    ${SEED_ADMIN_EMAIL}
    Password: ${SEED_ADMIN_PASSWORD}

  Demo participant join
    URL:       http://localhost:5173/join/${DEMO_JOIN_CODE}
    Join code: ${DEMO_JOIN_CODE}
`);

  await disconnectMongo();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
