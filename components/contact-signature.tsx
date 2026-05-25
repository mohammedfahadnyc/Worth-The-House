import { Github, Instagram, Linkedin } from "lucide-react";

const links = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/mohammedfahadnyc",
    icon: Linkedin,
  },
  {
    label: "GitHub",
    href: "https://github.com/mohammedfahadnyc",
    icon: Github,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/mohammedfahadnyc",
    icon: Instagram,
  },
];

export function ContactSignature() {
  return (
    <footer className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
      <p>
        Built by{" "}
        <span className="font-medium text-slate-300">Mohammed Fahad</span>
      </p>
      <div className="flex items-center gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
              title={link.label}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-muted-foreground transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="h-4 w-4" />
            </a>
          );
        })}
      </div>
    </footer>
  );
}
