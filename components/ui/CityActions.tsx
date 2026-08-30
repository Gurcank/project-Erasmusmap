"use client";

import { useActionState } from "react";
import { Bookmark, BookmarkCheck, Check, MapPin } from "lucide-react";
import { useT } from "@/hooks/useT";
import SubmitButton from "@/components/ui/SubmitButton";
import type { ActionResult, FormAction } from "@/lib/action-result";

type Props = {
  cityId: string;
  isVisited: boolean;
  isWishlisted: boolean;
  toggleVisit: FormAction;
  toggleWishlist: FormAction;
};

function ActionError({ state }: { state: ActionResult | null }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="text-xs text-danger-700 dark:text-danger-400">
      {state.error}
    </p>
  );
}

/**
 * The two list toggles in the city header. The stay dates used to live here
 * too; they moved next to the review form (see VisitDates), which is where the
 * rest of "I have been here" now belongs.
 */
export default function CityActions({
  cityId,
  isVisited,
  isWishlisted,
  toggleVisit,
  toggleWishlist,
}: Props) {
  const t = useT();
  const [visitState, visitAction] = useActionState(toggleVisit, null);
  const [wishState, wishAction] = useActionState(toggleWishlist, null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <form action={visitAction}>
          <input type="hidden" name="cityId" value={cityId} />
          <SubmitButton
            aria-pressed={isVisited}
            variant={isVisited ? "visited" : "secondary"}
            size="lg"
          >
            {isVisited ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <MapPin size={16} aria-hidden="true" />
            )}
            {isVisited ? t.markedVisited : t.markVisited}
          </SubmitButton>
        </form>

        <form action={wishAction}>
          <input type="hidden" name="cityId" value={cityId} />
          <SubmitButton
            aria-pressed={isWishlisted}
            variant={isWishlisted ? "wish" : "secondary"}
            size="lg"
          >
            {isWishlisted ? (
              <BookmarkCheck size={16} aria-hidden="true" />
            ) : (
              <Bookmark size={16} aria-hidden="true" />
            )}
            {isWishlisted ? t.inWishlist : t.addToWishlist}
          </SubmitButton>
        </form>
      </div>

      <ActionError state={visitState} />
      <ActionError state={wishState} />
    </div>
  );
}
