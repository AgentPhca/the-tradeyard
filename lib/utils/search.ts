// Shared multi-token substring search helpers for querying Supabase/
// PostgREST tables. Originally built for CardForm.tsx's player-name lookup
// against card_catalog, and reused by the Marketplace search box against
// cards and wishlist.
//
// The input is split into whitespace-separated tokens, and a row only
// counts as a match if EVERY token hits somewhere across the given columns
// (not necessarily the same column) — so "Drake Maye Flagship" finds
// "Drake"+"Maye" in player_name AND "Flagship" in set_name, letting a
// set/team/card-number token narrow a player search instead of just being
// ignored or (worse) required to also appear in player_name where it never
// would.

// PostgREST's `.or()` filter string uses "," to separate conditions and
// "()" to group them, so a token containing those would otherwise corrupt
// the filter instead of just failing to match anything. Strip them — none
// of the searchable text columns legitimately contain commas or parens, so
// this never drops a token a user actually meant.
export function sanitizeSearchToken(token: string): string {
  return token.replace(/[,()]/g, "");
}

export function tokenizeSearch(query: string): string[] {
  return query.trim().split(/\s+/).map(sanitizeSearchToken).filter(Boolean);
}

// One `or=(...)` filter string per token, each requiring the token to match
// at least one of `columns` via ilike substring match. PostgREST ANDs
// distinct filter params together, so applying every string in the returned
// array as its own `.or(...)` call gives "AND across tokens, OR across
// columns per token" semantics.
export function buildTokenOrFilters(tokens: string[], columns: readonly string[]): string[] {
  return tokens.map((token) => columns.map((column) => `${column}.ilike.%${token}%`).join(","));
}
