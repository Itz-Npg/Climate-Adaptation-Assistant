import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, ClipboardList, Compass, MapPinned } from 'lucide-react';

const TOOLS = [
  {
    key: 'risk',
    to: '/risk-checker',
    label: 'Climate risk checker',
    description: 'Score heat, flood, drought and water risk for a place.',
    icon: BarChart3,
  },
  {
    key: 'planner',
    to: '/planner',
    label: 'Adaptation planner',
    description: 'Turn risk into household tasks with priorities and dates.',
    icon: ClipboardList,
  },
  {
    key: 'compare',
    to: '/compare',
    label: 'Compare places',
    description: 'See two or three locations side by side.',
    icon: MapPinned,
  },
  {
    key: 'map',
    to: '/map',
    label: 'Climate map',
    description: 'Explore satellite maps with live weather.',
    icon: Compass,
  },
];

/** Contextual links so related pages link to each other. */
export default function RelatedTools({ current, title = 'Related tools' }) {
  const items = TOOLS.filter((tool) => tool.key !== current);

  return (
    <section className="mt-10 border-t border-line pt-8" aria-label="Related tools">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {items.map((tool) => (
          <Link
            key={tool.key}
            to={tool.to}
            className="group flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-leaf text-forest-700">
              <tool.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-semibold text-ink group-hover:text-forest-700">
                {tool.label}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted">{tool.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
