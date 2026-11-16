import Image from "next/image";
import { Section } from "./section";

type Member = {
  name: string;
  role: string;
  photo: string;
  focus: string;
  owner?: boolean;
};

export const TEAM: Member[] = [
  {
    name: "Ana Beatriz Costa Alves",
    role: "Computer Science Student",
    photo: "/team/ana-beatriz.jpg",
    focus: "50% 20%",
    owner: true,
  },
  { name: "Caique dos Santos Brito", role: "Computer Science Student", photo: "/team/caique.jpg", focus: "50% 48%" },
  { name: "Ewellyn Maria de França", role: "Computer Science Student", photo: "/team/ewellyn.jpg", focus: "50% 40%" },
  { name: "Vicenzo Benelli da Silva", role: "Computer Science Student", photo: "/team/vicenzo.jpg", focus: "30% 18%" },
  { name: "Igor da Silva de Brito", role: "Computer Science Student", photo: "/team/igor.png", focus: "50% 35%" },
  { name: "Iago da Silva de Brito", role: "Computer Science Student", photo: "/team/iago.jpg", focus: "50% 40%" },
];

export function Team() {
  return (
    <Section id="team" title="Our team">
      <p className="max-w-prose text-ink-300">
        The people behind Fire Atlas at the NASA Space Apps Challenge 2026.
      </p>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map((m) => (
          <li
            key={m.name}
            className="group flex items-center gap-4 rounded-[32px] border border-space-600 bg-space-900 p-4 transition-colors duration-200 hover:border-ember-400/60"
          >
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-space-600 bg-space-800">
              <Image
                src={m.photo}
                alt={`Photo of ${m.name}`}
                fill
                sizes="96px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                style={{ objectPosition: m.focus }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              {m.owner && (
                <span className="w-fit rounded-full border border-ember-400/60 bg-ember-400/10 px-2.5 py-0.5 text-caption font-semibold text-ember-400">
                  Team Owner
                </span>
              )}
              <h3 className="font-display text-lg font-bold leading-tight">{m.name}</h3>
              <p className="text-small font-semibold tracking-[-0.02em] text-ink-300">{m.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
