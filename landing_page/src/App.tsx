import { useState } from 'react';
import { motion } from 'motion/react';
import { ParticleRibbonBackground } from './components/ParticleRibbonBackground';
import {
  Archive,
  ChevronRight,
  FileText,
  Forward,
  Inbox,
  Menu,
  MoreHorizontal,
  Paperclip,
  Reply,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';

const gradientStyle = {
  backgroundImage:
    'linear-gradient(to right, #091020 0%, #0B2551 12.5%, #A4F4FD 32.5%, #00d2ff 50%, #0B2551 67.5%, #091020 87.5%, #091020 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  filter: 'url(#c3-noise)',
};

const navLinks = ['Solutions', 'Pricing', 'Blog', 'Documentation', 'Careers'];

const sidebarItems = [
  { icon: Inbox, label: 'Inbox', count: '12', active: true },
  { icon: Star, label: 'Starred', count: '3' },
  { icon: Send, label: 'Sent' },
  { icon: FileText, label: 'Drafts', count: '2' },
  { icon: Archive, label: 'Archive' },
  { icon: Trash2, label: 'Trash' },
];

const labels = [
  { name: 'Work', color: '#00d2ff' },
  { name: 'Personal', color: '#A4F4FD' },
  { name: 'Travel', color: '#f59e0b' },
  { name: 'Finance', color: '#10b981' },
];

const messages = [
  {
    name: 'Linear',
    subject: 'Weekly product digest',
    preview: 'Your team shipped 23 issues this week...',
    time: '9:41 AM',
    unread: true,
    active: true,
  },
  {
    name: 'Sophia Chen',
    subject: 'Re: Q3 roadmap review',
    preview: 'Thanks for sending the deck over. I had a few thoughts...',
    time: '8:12 AM',
    unread: true,
  },
  {
    name: 'Figma',
    subject: 'Marcus commented on your file',
    preview: 'Love the new direction on the landing hero.',
    time: 'Yesterday',
  },
  {
    name: 'Stripe',
    subject: 'Payout of $12,480.00 sent',
    preview: 'Your payout is on its way to your bank...',
    time: 'Yesterday',
  },
  {
    name: 'Vercel',
    subject: 'Deployment ready for aura-web',
    preview: 'Preview is live at aura-web-g3f.vercel.app',
    time: 'Mon',
  },
  {
    name: 'GitHub',
    subject: '[aura/core] PR #482 approved',
    preview: 'david-lim approved your pull request.',
    time: 'Mon',
  },
];

const triageGroups = [
  {
    title: 'Priority',
    count: 4,
    color: '#ffffff',
    items: ['Sophia Chen — Q3 review', 'David Lim — contract signoff'],
  },
  {
    title: 'Follow-up',
    count: 7,
    color: '#e5e5e5',
    items: ['Marcus — design review', 'Figma — comment thread'],
  },
  {
    title: 'Updates',
    count: 18,
    color: '#a3a3a3',
    items: ['Vercel — deploy ready', 'GitHub — PR #482 merged'],
  },
  {
    title: 'Archived',
    count: 13,
    color: '#525252',
    items: ['Stripe payout · Newsletter · Receipts'],
  },
];

const logoNames = ['Linear', 'Vercel', 'Figma', 'Stripe', 'Ramp', 'Notion', 'Loom', 'Arc'];

const testimonials = [
  {
    quote:
      'Aura gave our leadership team four hours of their week back. It reads like email from the future.',
    name: 'Parker Wilf',
    role: 'Group Product Manager',
    company: 'MERCURY',
  },
  {
    quote:
      "The command palette alone has changed how I process messages. I can't imagine going back to a traditional client.",
    name: 'Andrew von Rosenbach',
    role: 'Senior Engineering Program Manager',
    company: 'COHERE',
  },
  {
    quote:
      'Triage that actually understands context. Our team stopped dreading Monday morning inboxes.',
    name: 'Mathies Christensen',
    role: 'Engineering Manager',
    company: 'LUNAR',
  },
];

const plans = [
  {
    tier: 'Free',
    monthly: 'Free',
    yearly: 'Free',
    desc: 'For creators taking their first steps with Forma.',
    features: [
      'Up to 3 projects in the cloud',
      'Image export up to 1080p',
      'Basic editing tools',
      'Free templates and icons',
      'Access via web and mobile app.',
    ],
  },
  {
    tier: 'Standard',
    monthly: '$9,99/m',
    yearly: '$99,99/y',
    desc: 'For freelancers and small teams who need more freedom and flexibility.',
    features: [
      'Up to 50 projects in the cloud',
      'Export up to 4K',
      'Advanced editing toolkit',
      'Team collaboration (up to 5 members)',
      'Access to premium template library.',
    ],
  },
  {
    tier: 'Pro',
    monthly: '$19,99/m',
    yearly: '$199,99/y',
    desc: 'For studios, agencies, and professional creators working with brands.',
    features: [
      'Unlimited projects',
      'Export up to 8K + animations',
      'AI-powered content generation tools',
      'Unlimited team members',
      'Brand customization.',
    ],
    pro: true,
  },
];

function AppleLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function LogoMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
    </svg>
  );
}

function AppleButton({ label = 'Download Aura', full = false }: { label?: string; full?: boolean }) {
  return (
    <button
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-medium text-sm px-5 py-3 transition-all hover:bg-white/90 active:scale-[0.98] ${
        full ? 'w-full' : ''
      }`}
    >
      <AppleLogo />
      <span>{label}</span>
      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-px" />
    </button>
  );
}

function SectionEyebrow({ label, tag }: { label: string; tag?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-medium text-white/70">
      <span className="w-1.5 h-1.5 rounded-full bg-white" />
      <span>{label}</span>
      {tag ? (
        <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/50">{tag}</span>
      ) : null}
    </div>
  );
}

function RootNoiseFilter() {
  return (
    <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
      <filter id="c3-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0"
        />
        <feComposite in2="SourceGraphic" operator="in" result="noise" />
        <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
      </filter>
    </svg>
  );
}

function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between"
    >
      <a href="#" aria-label="onyxhub home" className="text-white">
        <LogoMark />
      </a>

      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link, index) => (
          <motion.a
            key={link}
            href="#"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05, duration: 0.5, ease: 'easeOut' }}
            className="text-white/70 text-sm font-medium hover:text-white transition-colors"
          >
            {link}
          </motion.a>
        ))}
      </div>

      <div className="hidden md:block">
        <AppleButton />
      </div>
      <button
        className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/5"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>
    </motion.nav>
  );
}

function Hero() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 md:pt-28 pb-20 text-center flex flex-col items-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-4xl md:text-7xl font-semibold tracking-tight leading-[0.9]"
      >
        <span className="block text-white">Your email.</span>
        <span className="block animate-shiny" style={gradientStyle}>
          Revitalized
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
        className="mt-8 text-white/60 max-w-md text-base leading-[1.5]"
      >
        Aura is the premier inbox platform for the current era. It leverages powerful AI to organize,
        prioritize, and refine your messages into total clarity.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.7, ease: 'easeOut' }}
        className="mt-8 flex flex-col items-center gap-3"
      >
        <AppleButton />
        <p className="text-xs text-white/40">Download for Intel / Apple Silicon</p>
      </motion.div>
    </section>
  );
}

function MacMenuBar() {
  const menus = ['File', 'Edit', 'View', 'Go', 'Window', 'Help'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.6, ease: 'easeOut' }}
      className="relative z-10 h-10 bg-black/40 backdrop-blur-md border-t border-b border-white/10"
    >
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 min-w-0">
          <AppleLogo className="w-3.5 h-3.5 shrink-0" />
          <span className="font-bold text-white">Aura</span>
          <div className="flex items-center gap-4 text-white/70">
            {menus.map((menu, index) => (
              <span key={menu} className={index > 3 ? 'hidden md:inline' : index > 2 ? 'hidden sm:inline' : ''}>
                {menu}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/70 shrink-0">
          <Search className="w-3.5 h-3.5" />
          <span>Wed May 6 1:09 PM</span>
        </div>
      </div>
    </motion.div>
  );
}

function InboxMockup() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0e1014]/90 backdrop-blur-2xl"
      >
        <div className="h-11 flex items-center justify-center border-b border-white/10 bg-white/[0.02] relative">
          <div className="absolute left-4 flex items-center gap-2">
            {['#ff5f57', '#febc2e', '#28c840'].map((color) => (
              <span key={color} className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            ))}
          </div>
          <span className="text-xs text-white/50">Aura — Inbox</span>
        </div>

        <div className="overflow-x-auto">
          <div className="grid grid-cols-12 h-[520px] min-w-[920px]">
            <aside className="col-span-3 border-r border-white/10 bg-black/30 p-4">
              <button className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-black text-xs font-semibold px-3 py-2">
                <Sparkles className="h-3.5 w-3.5" />
                Compose with Aura
              </button>

              <div className="mt-5 space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                        item.active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </span>
                      {item.count ? <span className="text-white/40">{item.count}</span> : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Labels</p>
                <div className="mt-3 space-y-2">
                  {labels.map((label) => (
                    <div key={label.name} className="flex items-center gap-2 text-xs text-white/60">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                      {label.name}
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <div className="col-span-4 border-r border-white/10">
              <div className="h-14 flex items-center gap-2 px-4 border-b border-white/10 text-white/40">
                <Search className="h-4 w-4" />
                <span className="text-sm">Search mail</span>
              </div>

              <div>
                {messages.map((message) => (
                  <button
                    key={`${message.name}-${message.subject}`}
                    className={`w-full text-left px-4 py-4 border-b border-white/10 transition-colors ${
                      message.active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {message.unread ? <span className="h-1.5 w-1.5 rounded-full bg-[#00d2ff]" /> : null}
                        <p className="truncate text-sm font-semibold text-white">{message.name}</p>
                      </div>
                      <span className="text-[11px] text-white/35 shrink-0">{message.time}</span>
                    </div>
                    <p className="mt-1 truncate text-xs font-medium text-white/80">{message.subject}</p>
                    <p className="mt-1 truncate text-xs text-white/40">{message.preview}</p>
                  </button>
                ))}
              </div>
            </div>

            <article className="col-span-5 bg-black/10">
              <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
                <div className="flex items-center gap-1 text-white/55">
                  {[Reply, Forward, Archive, Trash2].map((Icon, index) => (
                    <button
                      key={index}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-white/5 transition-colors"
                      aria-label={`Toolbar action ${index + 1}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
                <button className="w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-white/5 transition-colors text-white/55">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold tracking-tight text-white">Weekly product digest</h3>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#0B2551] flex items-center justify-center text-xs font-bold">
                      L
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">Linear</p>
                      <p className="text-xs text-white/40">to me · 9:41 AM</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/60">
                    Work
                  </span>
                </div>

                <div className="liquid-glass rounded-xl p-4 mt-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-[#A4F4FD]" />
                    Summary by Aura
                  </div>
                  <p className="mt-2 text-sm leading-[1.5] text-white/60">
                    Your team closed 23 issues, merged 14 PRs, and shipped 2 features. Top contributor:
                    Marcus. No action needed.
                  </p>
                </div>

                <div className="mt-6 space-y-4 text-sm leading-[1.6] text-white/68">
                  <p>Hi team,</p>
                  <p>
                    Here is your weekly digest of everything happening across your projects. This was a
                    strong week with significant progress on the Q3 roadmap.
                  </p>
                  <p>
                    Twenty-three issues were closed, fourteen pull requests were merged, and two
                    customer-facing features went out. The velocity trend continues to climb.
                  </p>
                  <p>Let me know if you would like a deeper breakdown by project or contributor.</p>
                  <p className="text-white/50">— The Linear team</p>
                </div>

                <button className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70">
                  <Paperclip className="h-3.5 w-3.5" />
                  digest-may-6.pdf
                </button>
              </div>
            </article>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function FeatureTriage() {
  const chips = ['Auto-categorize', 'Snooze for later', 'Silent newsletters', 'One-tap unsubscribe'];

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-10 md:gap-16 items-start">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-120px' }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <SectionEyebrow label="Triage" tag="AI-native" />
        <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02]">
          Clear your inbox
          <br />
          in a single pass.
        </h2>
        <p className="mt-6 text-white/60 text-base leading-[1.6] max-w-md">
          Aura reads every message, understands intent, and routes the noise away from the signal. Focus
          on what moves your day forward — the rest handles itself.
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]"
            >
              {chip}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-120px' }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="liquid-glass rounded-2xl p-5"
      >
        <p className="text-xs font-medium text-white/55">Today · 42 messages triaged</p>
        <div className="mt-4 grid gap-3">
          {triageGroups.map((group) => (
            <div key={group.title} className="liquid-glass rounded-lg p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                  <p className="text-sm font-semibold text-white">{group.title}</p>
                </div>
                <span className="text-xs text-white/40">{group.count}</span>
              </div>
              <div className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <p key={item} className="rounded-md bg-white/[0.025] px-3 py-2 text-xs text-white/55">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function LogoCloud() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-20">
      <p className="text-center text-xs uppercase tracking-widest text-white/40">
        Trusted by the world's most thoughtful teams
      </p>
      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 text-center">
        {logoNames.map((name, index) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ delay: index * 0.05, duration: 0.5, ease: 'easeOut' }}
            className="text-sm font-semibold tracking-tight text-white/50 hover:text-white transition-colors"
          >
            {name}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10">
      <div className="grid md:grid-cols-3 gap-5">
        {testimonials.map((testimonial) => (
          <figure key={testimonial.name} className="liquid-glass rounded-2xl p-6">
            <blockquote className="text-sm text-white/80 leading-[1.6]">"{testimonial.quote}"</blockquote>
            <figcaption className="mt-6 pt-5 border-t border-white/10">
              <p className="text-sm font-semibold text-white">{testimonial.name}</p>
              <p className="mt-1 text-xs text-white/50">{testimonial.role}</p>
              <p className="mt-3 text-xs text-white font-semibold tracking-wide">{testimonial.company}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="c3-pricing-section">
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <filter id="c3-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" stitchTiles="stitch" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.075" />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" result="noise" />
          <feBlend in="SourceGraphic" in2="noise" mode="overlay" />
        </filter>
      </svg>

      <div className="c3-watermark-container">
        <div className="c3-watermark-main">
          <span className="c3-watermark-line-1">Your email.</span>
          <span className="c3-watermark-line-2">Revitalized</span>
        </div>
      </div>

      <div className="c3-grid">
        {plans.map((plan) => (
          <article key={plan.tier} className={`c3-card ${plan.pro ? 'c3-card-pro' : ''}`}>
            <p className="c3-tier-small">{plan.tier}</p>
            <p className="c3-tier-large">{yearly ? plan.yearly : plan.monthly}</p>
            <p className="c3-desc">{plan.desc}</p>
            <ul className="c3-list">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <span className="c3-check">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path
                        d="M11.667 3.5 5.25 9.917 2.333 7"
                        stroke="white"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button className="c3-btn">Choose Plan</button>
          </article>
        ))}
      </div>

      <div className="c3-toggle-wrap">
        <span className="text-sm text-white/70">Yearly</span>
        <button
          className={`c3-toggle ${yearly ? 'active' : ''}`}
          onClick={() => setYearly((value) => !value)}
          aria-label="Toggle yearly pricing"
          aria-pressed={yearly}
        >
          <span className="c3-toggle-knob" />
        </button>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-120px' }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="liquid-glass relative overflow-hidden rounded-3xl px-8 py-16 md:py-24 text-center"
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: 'radial-gradient(600px circle at 50% 0%, rgba(255,255,255,0.15), transparent 70%)',
          }}
        />
        <div className="relative z-10">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02]">
            Close the tabs.
            <br />
            Open your day.
          </h2>
          <p className="mt-6 text-white/60 max-w-md mx-auto text-sm leading-[1.6]">
            Join thousands of builders, founders, and operators who treat email like a tool — not an
            obligation.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <AppleButton label="Download Aura" />
            <button className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/15 text-white text-sm font-medium px-5 py-3 hover:bg-white/5 transition-colors">
              Talk to sales
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-px" />
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default function App() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0c0c0c] text-white selection:bg-brand/30">
      <RootNoiseFilter />
      <ParticleRibbonBackground />
      <div className="hidden md:block pointer-events-none fixed inset-y-0 left-1/2 -translate-x-[calc(50%+36rem)] w-px bg-white/10 z-[5]" />
      <div className="hidden md:block pointer-events-none fixed inset-y-0 left-1/2 translate-x-[calc(-50%+36rem)] w-px bg-white/10 z-[5]" />

      <Navbar />
      <Hero />
      <MacMenuBar />
      <InboxMockup />
      <FeatureTriage />
      <LogoCloud />
      <Testimonials />
      <Pricing />
      <FinalCTA />
    </main>
  );
}
