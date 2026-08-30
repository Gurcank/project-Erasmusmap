type Props = {
  checked: boolean;
};

/**
 * The switch face used by the map's layer control: a recessed track with a
 * raised knob that slides across it.
 *
 * Presentational only — the row around it carries `role="switch"` and the
 * label, so this element is hidden from assistive tech rather than becoming a
 * second control inside the first.
 */
export default function Knob({ checked }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`relative flex h-6 w-12 shrink-0 rounded-full shadow-track transition-colors duration-200 motion-reduce:transition-none ${
        checked ? "bg-primary" : "bg-ink-50/15"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink-50 shadow-knob transition-[left] duration-200 motion-reduce:transition-none ${
          checked ? "left-6.5" : "left-0.5"
        }`}
      />
    </span>
  );
}
