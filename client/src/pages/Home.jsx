import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Flame,
  Gauge,
  Leaf,
  MapPinned,
  ShieldCheck,
  ThermometerSun,
  Waves,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ClimateMap from '../components/ClimateMap';
import { useSeo } from '../lib/seo';

const previewPins = [
  {
    id: 'delhi',
    lat: 28.6139,
    lon: 77.209,
    title: 'New Delhi',
    subtitle: 'Hot and dry, dense urban core',
    tone: 'high',
    details: [
      { label: 'Heat risk', value: '81/100' },
      { label: 'Flood risk', value: '46/100' },
    ],
  },
  {
    id: 'kochi',
    lat: 9.9312,
    lon: 76.2673,
    title: 'Kochi',
    subtitle: 'Coastal, strong monsoon',
    tone: 'severe',
    details: [
      { label: 'Heat risk', value: '62/100' },
      { label: 'Flood risk', value: '88/100' },
    ],
  },
  {
    id: 'shimla',
    lat: 31.1048,
    lon: 77.1734,
    title: 'Shimla',
    subtitle: 'High altitude, cool',
    tone: 'low',
    details: [
      { label: 'Heat risk', value: '24/100' },
      { label: 'Flood risk', value: '31/100' },
    ],
  },
];

const features = [
  {
    number: '01 CHECK',
    title: 'Understand risks',
    description:
      'Answer a few questions about your area and see an illustrative risk score for heat, flooding, drought and water scarcity.',
    icon: Gauge,
    to: '/risk-checker',
    action: 'Open risk checker',
  },
  {
    number: '02 PREPARE',
    title: 'Plan ahead',
    description:
      'Build a household adaptation plan with tasks, priorities and deadlines, then track how much you have completed.',
    icon: ClipboardList,
    to: '/planner',
    action: 'Open planner',
  },
  {
    number: '03 EXPLORE',
    title: 'Compare options',
    description:
      'Compare two or three places side by side on heat, flood, water availability and green cover before you decide.',
    icon: MapPinned,
    to: '/compare',
    action: 'Compare places',
  },
];

const steps = [
  {
    title: 'Tell us about your area',
    description: 'City, housing type, nearby water bodies, drainage and local climate — no account setup beyond an email.',
    icon: ThermometerSun,
  },
  {
    title: 'Review your risk profile',
    description: 'See four hazard scores, the factors behind them and practical steps that actually lower your exposure.',
    icon: ShieldCheck,
  },
  {
    title: 'Track your adaptation plan',
    description: 'Turn recommendations into tasks, set priorities and deadlines, and follow your progress on the dashboard.',
    icon: CheckCircle2,
  },
];

const stats = [
  {
    value: '1.5\u00b0C',
    label: 'Warming threshold',
    detail: 'The Paris Agreement target that climate adaptation planning is measured against.',
    icon: Flame,
  },
  {
    value: '3.6B',
    label: 'People highly vulnerable',
    detail: 'People living in contexts highly vulnerable to climate change, according to IPCC AR6 summaries.',
    icon: Waves,
  },
  {
    value: '90%',
    label: 'Disasters water-related',
    detail: 'Share of major disasters that are water- or climate-related, per WMO summaries.',
    icon: Droplets,
  },
  {
    value: '4',
    label: 'Hazards tracked',
    detail: 'Extreme heat, flooding, drought and water scarcity — the four concerns this project focuses on.',
    icon: BarChart3,
  },
];

export default function Home() {
  const { user } = useAuth();
  const primaryTarget = user ? '/dashboard' : '/signup';

  useSeo({
    title: 'Prepare Today for a Climate-Resilient Tomorrow',
    description:
      'Check heat, flood, drought and water risks for your area, build a household adaptation plan and compare places side by side. Free and simple.',
    path: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Climate Adaptation Assistant',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      description:
        'A household climate adaptation tool: risk screening, adaptation planning and place comparison.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: [
        { '@type': 'Person', name: 'Aaditya Bhattarai' },
        { '@type': 'Person', name: 'Shivanshu Thakur' },
        { '@type': 'Person', name: 'Ritik Sharma' },
      ],
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-canvas">
        <div className="container-page grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="eyebrow">A simple guide for families</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Prepare Today for a Climate-Resilient Tomorrow
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Understand local concerns like heat, heavy rain and water shortages. Turn them into a
              simple household plan, and keep the important information in one place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={primaryTarget} className="btn-primary">
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#features" className="btn-outline">
                Explore Features
              </a>
            </div>
            <p className="mt-5 text-xs text-muted">
              Scores are illustrative estimates for learning — not official forecasts.
            </p>
          </div>

          <div className="card-soft">
            <h2 className="text-2xl font-bold leading-snug text-forest-700 sm:text-[26px]">
              Small steps can make a difference
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-forest-800/80">
              Know the risks. Plan your resources. Keep important information in one place.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: 'Heat safety', icon: ThermometerSun },
                { label: 'Water planning', icon: Droplets },
                { label: 'Flood readiness', icon: Waves },
              ].map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl bg-white/70 px-3 py-3 text-left text-[13px] font-medium text-forest-800"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-forest-600 text-white">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-forest-200/70 bg-white/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-forest-700">
                Built for households
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-forest-900/80">
                Check four hazards, save your assessments, and keep a checklist your family can act
                on during a bad week.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What is climate adaptation */}
      <section className="container-page grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <span className="eyebrow">The idea</span>
          <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">What is climate adaptation?</h2>
        </div>
        <div className="space-y-4 text-base leading-relaxed text-muted">
          <p>
            Climate adaptation means adjusting how we build, store water and plan our days so that
            climate stresses hurt us less. It is the practical counterpart to reducing emissions:
            one limits future change, the other keeps households safe in the change already here.
          </p>
          <p>
            For a family, adaptation is rarely a big project. It looks like a week of drinking water
            in covered containers, a shaded cool room, documents in a waterproof bag, and a family
            contact plan for flood season.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              'Know which hazard matters most where you live',
              'Store the basics before the season starts',
              'Keep emergency contacts and documents ready',
              'Review your plan after every hot or wet spell',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-xl bg-canvas px-3.5 py-3">
                <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" aria-hidden="true" />
                <span className="text-sm text-ink">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="border-y border-line bg-canvas py-16 scroll-mt-16">
        <div className="container-page">
          <h2 className="text-3xl font-extrabold sm:text-4xl">What can you do here?</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <Link
                key={feature.title}
                to={user ? feature.to : '/login'}
                className="card group flex flex-col transition hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="eyebrow w-fit">{feature.number}</span>
                <div className="mt-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf text-forest-700">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{feature.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700">
                  {feature.action}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live map highlight */}
      <section className="container-page py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="eyebrow">Live map</span>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">See your area from above</h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Search any town or city and explore it on satellite, street or terrain maps. Live
              temperature, humidity, wind and rainfall come from a free public weather API, so you
              can compare conditions before you plan.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                'Satellite, street and terrain views in one map',
                'Live conditions and a three-day outlook for any pin',
                'Jump straight from the map into a full risk assessment',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-ink">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/map" className="btn-primary mt-7">
              Open the climate map
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="min-w-0">
            <ClimateMap
              places={previewPins}
              height={380}
              defaultBaseLayer="satellite"
              ariaLabel="Preview of the climate map"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Satellite imagery &copy; Esri, Maxar, Earthstar Geographics. Scores shown on the pins
              are illustrative examples.
            </p>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="container-page py-16">
        <div className="max-w-2xl">
          <span className="eyebrow">Why it matters</span>
          <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">Climate statistics and awareness</h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Adaptation starts with understanding the scale of the problem — and what is still within
            a household&apos;s control.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf text-forest-700">
                <stat.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-4 text-3xl font-extrabold text-forest-700">{stat.value}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{stat.label}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{stat.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          Figures summarised from IPCC AR6 and WMO public summaries; rounded for a student project.
        </p>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-canvas py-16">
        <div className="container-page">
          <div className="max-w-2xl">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">Three steps, one plan</h2>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="card">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-600 text-white">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-2xl font-extrabold text-forest-100">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16">
        <div className="rounded-3xl bg-forest-700 px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            Ready to check your climate risks?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-forest-100">
            Create a free account to save assessments, build a household plan and compare places
            side by side.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={primaryTarget} className="btn bg-white text-forest-700 hover:bg-forest-50">
              {user ? 'Go to dashboard' : 'Create your account'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/team" className="btn border border-white/40 text-white hover:bg-white/10">
              Meet the team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
