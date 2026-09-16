"use client";

import Link from "next/link";
import { RoadmapNode } from "@/types";
import { courses } from "@/data/courses";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { IconCheck, IconLock } from "@/components/ui/Icon";

export default function RoadmapVisual({ nodes }: { nodes: RoadmapNode[] }) {
  const { getCourseProgress } = useUser();

  // Calcule le statut réel de chaque nœud depuis la progression des cours
  const enrichedNodes = nodes.map((node) => {
    if (!node.courseSlug) return node;
    const course = courses.find((c) => c.slug === node.courseSlug);
    if (!course) return node;
    const progress = getCourseProgress(course.id);
    const status =
      progress === 100
        ? "termine"
        : progress > 0
        ? "en_cours"
        : "verrouille";
    return { ...node, status } as RoadmapNode;
  });

  return (
    <div className="bg-dark-navy border border-white/5 rounded-xl2 p-6">
      <h3 className="font-display font-semibold text-lg mb-6">Ta roadmap</h3>
      <div className="flex flex-col">
        {enrichedNodes.map((node, i) => {
          const inner = (
            <div key={node.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-display font-semibold border-2 shrink-0",
                    node.status === "termine" &&
                      "border-cyber-green text-cyber-green bg-cyber-green/10",
                    node.status === "en_cours" &&
                      "border-cyber-blue text-cyber-blue bg-cyber-blue/10 shadow-glow",
                    node.status === "verrouille" && "border-white/10 text-white/30"
                  )}
                >
                {node.status === "termine"
                    ? <IconCheck size={14} strokeWidth={2.5} />
                    : node.status === "verrouille"
                    ? <IconLock size={12} strokeWidth={2} />
                    : i + 1}
                </div>
                {i < enrichedNodes.length - 1 && (
                  <div className="w-px flex-1 bg-white/10 my-1" />
                )}
              </div>
              <div className={cn("pb-6", node.status === "verrouille" && "opacity-50")}>
                <p className="font-medium">{node.title}</p>
                <p className="text-sm text-white/50">{node.description}</p>
              </div>
            </div>
          );

          // Nœuds avec cours associé et non verrouillés : cliquables
          if (node.courseSlug && node.status !== "verrouille") {
            return (
              <Link
                key={node.id}
                href={`/courses/${node.courseSlug}`}
                className="hover:opacity-80 transition-opacity"
              >
                {inner}
              </Link>
            );
          }
          return inner;
        })}
      </div>
    </div>
  );
}
