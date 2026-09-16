import ProgressBar from "@/components/ui/ProgressBar";
import { SkillProgress } from "@/types";

export default function SkillBar({ skill }: { skill: SkillProgress }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span>{skill.name}</span>
        <span className="text-white/50">{skill.percent}%</span>
      </div>
      <ProgressBar value={skill.percent} tone="blue" height="sm" />
    </div>
  );
}
