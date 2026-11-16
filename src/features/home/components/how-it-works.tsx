import { Section } from "./section";

const STEPS = [
  {
    title: "Choose an area and time period",
    text: "Use the Filters button to choose sensors, a continent or a state in Brazil, an area drawn on the map or entered as coordinates, and a time period, with shortcuts for 7 and 30 days, a month, or a year.",
  },
  {
    title: "Explore the map",
    text: "Hotspots are aggregated into hexagons: at a distance, cells span hundreds of kilometers; as you zoom in, they shrink to about 7 km. Click a cell to see how many hotspots came from each sensor.",
  },
  {
    title: "Track activity in the calendar and analytics",
    text: "Daily cards with counts for each sensor, a time series, cells with the most detections, days with unusual activity, and comparisons with previous years when historical data is available.",
  },
  {
    title: "Look ahead with the forecast",
    text: "The probability of fire in each hexagon over the next 7 days, calculated by the data team's model. Explore the risk map and the most likely areas; this is an estimate, not an observed detection.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how" title="What the platform offers">
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex flex-col rounded-2xl border border-space-600 bg-space-800 p-6"
          >
            <span className="font-mono text-small text-ember-400">
              Step {i + 1}
            </span>
            <h3 className="mt-1 font-display text-xl font-bold">
              {step.title}
            </h3>
            <p className="mt-2 text-ink-300">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
