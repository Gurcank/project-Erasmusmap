"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import ActionForm from "@/components/ui/ActionForm";
import GlassButton from "@/components/ui/GlassButton";
import SubmitButton from "@/components/ui/SubmitButton";
import type { TripActions } from "@/components/trips/planner-types";
import { useTripT } from "@/hooks/useTripT";

type Props = {
  tripId: string;
  token: string;
  actions: Pick<TripActions, "rotateShareLink">;
};

const noSubscription = () => () => {};

/**
 * The link of a plan shared by link: shown to the owner only, with a way to
 * copy it and a way to replace it. Replacing it is the answer to a link that
 * went to the wrong place, so it asks first and the old one is dead at once.
 */
export default function ShareLink({ tripId, token, actions }: Props) {
  const { tt } = useTripT();
  const [copied, setCopied] = useState(false);
  // The address is only known in the browser; the server renders it empty.
  const origin = useSyncExternalStore(
    noSubscription,
    () => window.location.origin,
    () => "",
  );
  const url = `${origin}/t/${token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard permission: the field is selectable, so it can be copied by hand.
    }
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <label htmlFor="trip-share-link" className="sr-only">
        {tt.shareLinkLabel}
      </label>
      <input
        id="trip-share-link"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className="field min-w-0 flex-1 px-3 py-1.5 text-xs"
      />
      <GlassButton size="sm" onClick={copy}>
        {copied ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
        <span role="status">{copied ? tt.linkCopied : tt.copyLink}</span>
      </GlassButton>
      <ActionForm
        action={actions.rotateShareLink}
        confirmMessage={tt.confirmRotateLink}
        confirmLabel={tt.rotateLinkConfirm}
      >
        <input type="hidden" name="tripId" value={tripId} />
        <SubmitButton size="sm" variant="ghost">
          <RefreshCw size={14} aria-hidden="true" />
          {tt.rotateLink}
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
