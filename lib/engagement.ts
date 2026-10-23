/** Longest reply to a review. Replies are short by design — a long answer
 *  belongs in a review of its own. */
export const MAX_REPLY_LENGTH = 400;

/**
 * The most comments read for one review. A thread longer than this shows its
 * newest ones; the review page loads every thread on it at once, so an unbounded
 * thread would be an unbounded page.
 */
export const MAX_COMMENTS_PER_REVIEW = 200;

/** How many featured reviews The Square shows. */
export const TRENDING_REVIEW_LIMIT = 10;

/** How many cities The Square ranks. */
export const TRENDING_CITY_LIMIT = 5;

/** The window that counts as "recent" when ranking. */
export const TRENDING_WINDOW_DAYS = 30;
