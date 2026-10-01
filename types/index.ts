export interface MentorMessage {
  id: string;
  role: "mentor" | "user";
  content: string;
  createdAt: string;
}