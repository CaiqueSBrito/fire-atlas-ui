import { Section } from "./section";

export function AboutChallenge() {
  return (
    <Section id="about" title="The challenge">
      <div className="flex max-w-4xl flex-col gap-5 text-lg leading-relaxed text-ink-300">
        <p>
          Satellites have monitored active hotspots for more than two decades.
          But the record is split across sensors whose data cannot be compared
          directly, leaving emergency managers without a consistent picture
          of when and where burning occurred.
        </p>
        <p>
          Our goal is to <strong className="text-ink-100">harmonize</strong>{" "}
          MODIS and VIIRS records into a calendar of fire activity, so the
          source sensor no longer matters and patterns, trends, and anomalies
          take center stage.
        </p>
      </div>
    </Section>
  );
}
