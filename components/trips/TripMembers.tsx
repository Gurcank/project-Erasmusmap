"use client";

import Link from "next/link";
import { Trash2, UserPlus } from "lucide-react";
import ActionForm from "@/components/ui/ActionForm";
import GlassButton from "@/components/ui/GlassButton";
import SubmitButton from "@/components/ui/SubmitButton";
import type { TripActions } from "@/components/trips/planner-types";
import { fill, useTripT } from "@/hooks/useTripT";
import { MAX_TRIP_MEMBERS } from "@/lib/trip-limits";
import type { TripMemberView, TripView } from "@/lib/trip-types";

type Props = {
  trip: TripView;
  actions: Pick<
    TripActions,
    "inviteToTrip" | "removeTripMember" | "setTripMemberRole"
  >;
};

function MemberName({ member }: { member: TripMemberView }) {
  const { user } = member;
  if (!user.username) return <span>{user.name ?? "—"}</span>;
  return (
    <Link href={`/u/${user.username}`} className="underline">
      @{user.username}
    </Link>
  );
}

/**
 * The owner's list of who is on the plan and the way to add someone. Roles are
 * the owner's to set; an invited person has no access until they accept.
 */
export default function TripMembers({ trip, actions }: Props) {
  const { tt } = useTripT();
  const full = trip.members.length >= MAX_TRIP_MEMBERS;

  return (
    <section
      aria-labelledby="trip-members"
      className="glass mt-4 rounded-panel border border-border bg-surface px-4 py-4"
    >
      <h2
        id="trip-members"
        className="font-display text-base font-semibold text-text"
      >
        {tt.members}
      </h2>
      <p className="mt-0.5 text-xs text-text-muted">{tt.membersHint}</p>

      {trip.members.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {trip.members.map((member) => {
            const other = member.role === "EDITOR" ? "VIEWER" : "EDITOR";
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border bg-surface-raised/60 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-text">
                  <MemberName member={member} />
                </span>
                <span className="rounded-full bg-ink-500/15 px-2 py-0.5 text-xs text-text-muted">
                  {tt[`role${member.role}`]}
                </span>
                {member.status === "PENDING" && (
                  <span className="rounded-full bg-wish-500/15 px-2 py-0.5 text-xs text-wish-700 dark:text-wish-400">
                    {tt.memberPending}
                  </span>
                )}
                <ActionForm action={actions.setTripMemberRole}>
                  <input type="hidden" name="tripId" value={trip.id} />
                  <input type="hidden" name="memberId" value={member.id} />
                  <input type="hidden" name="role" value={other} />
                  <SubmitButton size="sm" variant="ghost">
                    {tt[`makeRole${other}`]}
                  </SubmitButton>
                </ActionForm>
                <ActionForm
                  action={actions.removeTripMember}
                  confirmMessage={tt.confirmRemoveMember}
                  confirmLabel={tt.removeMember}
                >
                  <input type="hidden" name="tripId" value={trip.id} />
                  <input type="hidden" name="memberId" value={member.id} />
                  <GlassButton
                    type="submit"
                    size="iconSm"
                    variant="ghost"
                    aria-label={tt.removeMember}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </GlassButton>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      )}

      {full ? (
        <p className="mt-3 text-xs text-text-muted">
          {fill(tt.membersFull, { n: MAX_TRIP_MEMBERS })}
        </p>
      ) : (
        <ActionForm
          action={actions.inviteToTrip}
          className="mt-3 flex flex-wrap items-end gap-2"
          errorClassName="w-full text-sm text-danger-700 dark:text-danger-400"
        >
          <input type="hidden" name="tripId" value={trip.id} />
          <div className="min-w-40 flex-1">
            <label
              htmlFor="invite-username"
              className="mb-1 block text-xs text-text-subtle"
            >
              {tt.inviteUsername}
            </label>
            <input
              id="invite-username"
              name="username"
              required
              maxLength={21}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="@username"
              className="field w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="invite-role"
              className="mb-1 block text-xs text-text-subtle"
            >
              {tt.inviteRole}
            </label>
            <select
              id="invite-role"
              name="role"
              defaultValue="EDITOR"
              className="field px-3 py-2 text-sm"
            >
              <option value="EDITOR">{tt.roleEDITOR}</option>
              <option value="VIEWER">{tt.roleVIEWER}</option>
            </select>
          </div>
          <SubmitButton size="sm" variant="primary">
            <UserPlus size={14} aria-hidden="true" />
            {tt.inviteSend}
          </SubmitButton>
        </ActionForm>
      )}
    </section>
  );
}
