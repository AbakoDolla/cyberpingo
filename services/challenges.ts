import { mockDelay } from "./api";
import { challenges } from "@/data/challenges";
import { Challenge } from "@/types";

export async function fetchChallenges(): Promise<Challenge[]> {
  return mockDelay(challenges);
}

export async function fetchChallengeBySlug(slug: string): Promise<Challenge | undefined> {
  return mockDelay(challenges.find((c) => c.slug === slug));
}

export async function submitChallengeAnswer(
  _challengeId: string,
  answer: string
): Promise<{ correct: boolean }> {
  return mockDelay({ correct: answer.trim().length > 0 }, 500);
}
