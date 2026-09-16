import { User } from "@/types";
import { badges } from "./badges";

export const currentUser: User = {
  id: "u1",
  name: "Death",
  username: "death",
  email: "death@cyberpingo",
  avatarUrl: "/avatar-placeholder.svg",
  level: 1,
  xp: 0,
  xpToNextLevel: 800,
  streak: 0,
  joinedAt: new Date().toISOString().split("T")[0],
  goal: "professionnel",
  skillLevel: "debutant",
  dailyMinutes: 20,
  badges: badges.map((b) => ({ ...b, earned: false, earnedAt: undefined })),
  skills: [
    { name: "Networking", percent: 0 },
    { name: "Linux", percent: 0 },
    { name: "Web Security", percent: 0 },
    { name: "Cryptographie", percent: 0 },
  ],
  completedLessons: [],
  completedChallenges: [],
  completedQuizzes: 0,
  isAdmin: true,
};
