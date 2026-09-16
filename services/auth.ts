import { mockDelay } from "./api";
import { currentUser as adminUser } from "@/data/users";
import { User } from "@/types";

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Identifiants de l'admin — seul compte avec accès au dashboard admin. */
const ADMIN_EMAIL = "death@cyberpingo";
const ADMIN_PASSWORD = "1234";

/**
 * Crée un profil utilisateur standard à partir de son email.
 * Les comptes non-admin ont isAdmin = false et n'accèdent pas au dashboard.
 */
function createUserFromEmail(email: string): User {
  const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const displayName = email.split("@")[0]
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: `user-${username}`,
    name: displayName,
    username,
    email,
    avatarUrl: "/avatar-placeholder.svg",
    level: 1,
    xp: 0,
    xpToNextLevel: 800,
    streak: 0,
    joinedAt: new Date().toISOString().split("T")[0],
    goal: "decouvrir",
    skillLevel: "debutant",
    dailyMinutes: 20,
    badges: adminUser.badges.map((b) => ({ ...b, earned: false, earnedAt: undefined })),
    skills: [
      { name: "Networking", percent: 0 },
      { name: "Linux", percent: 0 },
      { name: "Web Security", percent: 0 },
      { name: "Cryptographie", percent: 0 },
    ],
    completedLessons: [],
    completedChallenges: [],
    completedQuizzes: 0,
    isAdmin: false,
  };
}

/**
 * Authentification à deux niveaux :
 * - death@cyberpingo + 1234 → profil admin (isAdmin: true) → /dashboard
 * - Tout autre email valide + n'importe quel mot de passe → profil utilisateur (isAdmin: false) → /courses
 *
 * Un mot de passe vide est refusé pour tout le monde.
 */
export async function loginUser(payload: LoginPayload): Promise<User> {
  await mockDelay(null, 600);

  const email = payload.email.trim().toLowerCase();

  // Vérification du mot de passe minimum (non vide)
  if (!payload.password || payload.password.length < 1) {
    throw new Error("Le mot de passe ne peut pas être vide.");
  }

  // Compte admin
  if (email === ADMIN_EMAIL) {
    if (payload.password !== ADMIN_PASSWORD) {
      throw new Error("Mot de passe admin incorrect.");
    }
    return adminUser;
  }

  // Tout autre email valide → utilisateur standard
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Adresse email invalide.");
  }

  return createUserFromEmail(email);
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  await mockDelay(null, 600);

  const email = payload.email.trim().toLowerCase();

  // L'email admin ne peut pas s'inscrire (il existe déjà)
  if (email === ADMIN_EMAIL) {
    throw new Error("Ce compte existe déjà.");
  }

  return createUserFromEmail(email);
}

export async function logoutUser(): Promise<void> {
  await mockDelay(null, 200);
}
