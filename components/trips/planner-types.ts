import type { ActionResult, FormAction } from "@/lib/action-result";

export type TripActions = {
  updateTrip: FormAction;
  deleteTrip: FormAction;
  setTripVisibility: FormAction;
  saveTripItem: FormAction;
  deleteTripItem: FormAction;
  saveTripExpense: FormAction;
  deleteTripExpense: FormAction;
  addTripCity: FormAction;
  removeTripCity: FormAction;
  saveTripCityNotes: FormAction;
  addTripTodo: FormAction;
  toggleTripTodo: FormAction;
  deleteTripTodo: FormAction;
};

/**
 * Runs `onSuccess` after a successful action — how a panel closes itself once
 * its save has landed, without an effect watching the result.
 */
export function withSuccess(action: FormAction, onSuccess: () => void) {
  return async (
    previous: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> => {
    const result = await action(previous, formData);
    if (result.ok) onSuccess();
    return result;
  };
}
