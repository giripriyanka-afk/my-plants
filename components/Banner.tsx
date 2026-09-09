"use client";

/**
 * The app's message strip. Three of these were open-coded in PlantsApp with
 * identical markup and only the colour token differing, which meant a fourth
 * would have been a fourth copy.
 *
 * `onDismiss` is optional: the storage-unavailable warning is a standing
 * condition the user cannot clear, while an import result or a save error can
 * be acknowledged.
 */

export type BannerTone = "warning" | "error" | "info";

const TONE_CLASS: Readonly<Record<BannerTone, string>> = Object.freeze({
  warning: "bg-status-due-bg text-status-due",
  error: "bg-status-overdue-bg text-status-overdue",
  info: "bg-status-soon-bg text-status-soon",
});

interface Props {
  tone: BannerTone;
  children: React.ReactNode;
  onDismiss?: () => void;
}

export default function Banner({ tone, children, onDismiss }: Props) {
  return (
    <p
      className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${TONE_CLASS[tone]}`}
    >
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="font-semibold underline"
        >
          Dismiss
        </button>
      )}
    </p>
  );
}
