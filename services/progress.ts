import { mockDelay } from "./api";
import { roadmap } from "@/data/roadmap";
import { currentUser } from "@/data/users";
import { RoadmapNode, User } from "@/types";

export async function fetchRoadmap(): Promise<RoadmapNode[]> {
  return mockDelay(roadmap);
}

export async function fetchCurrentUser(): Promise<User> {
  return mockDelay(currentUser);
}

export async function addXp(_userId: string, amount: number): Promise<{ newXp: number }> {
  return mockDelay({ newXp: currentUser.xp + amount }, 300);
}
