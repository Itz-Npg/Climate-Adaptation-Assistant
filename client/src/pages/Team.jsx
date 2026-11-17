import { Code2, Database, Layers, Server, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '../components/ui';
import Breadcrumbs from '../components/Breadcrumbs';
import { useSeo } from '../lib/seo';

const team = [
  {
    name: 'Aaditya Bhattarai',
    initials: 'AB',
    role: 'Frontend & product',
    focus: 'Interface design, risk checker flow and responsive layouts.',
  },
  {
    name: 'Shivanshu Thakur',
    initials: 'ST',
    role: 'Backend & data models',
    focus: 'Express API, Mongoose models and ownership checks.',
  },
  {
    name: 'Ritik Sharma',
    initials: 'RS',
    role: 'Research & planning tools',
    focus: 'Adaptation content, planner logic and comparison factors.',
  },
];

const techStack = [
  { name: 'React + Vite', icon: Layers },
  { name: 'Tailwind CSS', icon: Code2 },
  { name: 'Node.js + Express', icon: Server },
  { name: 'MongoDB Atlas + Mongoose', icon: Database },
  { name: 'JWT + bcryptjs', icon: ShieldCheck },
  { name: 'Recharts + Lucide', icon: Users },
];

export default function Team() {
  useSeo({
    title: 'Our Team and Project',
    description:
      'Meet the students behind the Climate Adaptation Assistant and the technologies used to build it: React, Express, MongoDB, JWT authentication and live climate data.',
    path: '/team',
    breadcrumbs: [{ label: 'Our team' }],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About the Climate Adaptation Assistant team',
      about: {
        '@type': 'Organization',
        name: 'Climate Adaptation Assistant',
        member: [
          { '@type': 'Person', name: 'Aaditya Bhattarai' },
          { '@type': 'Person', name: 'Shivanshu Thakur' },
          { '@type': 'Person', name: 'Ritik Sharma' },
        ],
      },
    },
  });

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="WS Section"
        title="About Our Project"
        description="We are a three-person student team exploring how families can better understand climate-related challenges and prepare for them with practical, low-cost steps."
      />

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {team.map((member) => (
          <div key={member.name} className="card">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf text-base font-bold text-forest-700">
                {member.initials}
              </span>
              <span className="rounded-full border border-forest-200 bg-forest-50 px-2.5 py-1 text-[11px] font-semibold text-forest-700">
                Team member
              </span>
            </div>
            <h2 className="mt-4 text-lg font-bold">{member.name}</h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-forest-600">
              {member.role}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{member.focus}</p>
            <p className="mt-3 text-xs text-muted">WS Section</p>
          </div>
        ))}
      </div>

      <div className="card-soft mt-6">
        <h2 className="text-lg font-bold text-forest-800">Our aim</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-forest-900/85">
          To learn from real users and design a simple guide with practical preparedness information,
          household resource planning and the factors worth considering when comparing locations. The
          project shows how a small, focused tool can turn climate anxiety into a checklist a family
          can actually complete.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'Understand', text: 'Explain four local hazards in plain language.' },
            { title: 'Prepare', text: 'Turn guidance into trackable household tasks.' },
            { title: 'Compare', text: 'Weigh places on the factors that matter to a family.' },
          ].map((item) => (
            <div key={item.title} className="rounded-xl bg-white/80 px-4 py-3">
              <p className="text-sm font-semibold text-forest-800">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-forest-900/75">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Technologies used</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {techStack.map((tech) => (
            <div key={tech.name} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf text-forest-700">
                <tech.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-ink">{tech.name}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-line bg-canvas px-5 py-4">
        <p className="text-xs leading-relaxed text-muted">
          This is an educational concept prototype developed by Aaditya Bhattarai, Shivanshu Thakur and
          Ritik Sharma (WS Section). It does not provide official warnings, verified forecasts or
          relocation advice. Always follow local authorities and official weather services during an
          emergency.
        </p>
      </div>
    </div>
  );
}
