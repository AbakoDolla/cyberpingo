import { formatDuration, levelLabel } from "@/lib/format";
import type { CourseSummary } from "@/types/api";

export default function ProgressionSection({ courses }: { courses: CourseSummary[] }) {
  return (
    <section id="roadmap" className="max-w-7xl mx-auto px-6 py-20">
      <div className="max-w-2xl mb-14">
        <h2 className="font-display text-3xl md:text-4xl font-semibold">Une séquence publiée, pas une progression inventée</h2>
        <p className="mt-4 text-white/60">Les parcours ci-dessous viennent du catalogue Supabase et gardent leur ordre éditorial.</p>
      </div>
      {courses.length ? <div className="relative"><div className="hidden md:block absolute left-0 right-0 top-6 h-px bg-white/10" /><div className="grid md:grid-cols-6 gap-6 md:gap-4">{courses.map((course, index) => (
        <div key={course.id} className="relative flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center font-display font-semibold border-2 z-10 bg-cyber-black border-cyber-blue text-cyber-blue">{index + 1}</div>
          <p className="mt-3 text-sm font-medium">{course.title}</p>
          <p className="mt-1 text-xs text-white/50">{levelLabel(course.level)} · {formatDuration(course.estimated_duration)}</p>
        </div>
      ))}</div></div> : <div className="library-empty"><h2>Aucun parcours publié pour le moment.</h2><p>La roadmap se remplira automatiquement avec les vrais parcours.</p></div>}
    </section>
  );
}