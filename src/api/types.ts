export type Sport = "soccer" | "tennis" | "paddle" | "basketball";
export type Gender = "male" | "female";
export type Locale = "en" | "fr" | "ar";
export type Theme = "light" | "dark" | "system";
export type TeamRole = "captain" | "admin" | "member";
export type ListingStatus = "open" | "closed" | "confirmed" | "withdrawn" | "expired";
export type ApplicationStatus =
  | "pending"
  | "accepted"
  | "confirmed"
  | "declined"
  | "withdrawn";
export type ApplicationDirection = "player_applied" | "team_invited";
export type MatchStatus = "confirmed" | "cancelled_by_a" | "cancelled_by_b" | "played";

export const SPORTS: Sport[] = ["soccer", "tennis", "paddle", "basketball"];

export interface User {
  id: string;
  name: string;
  phone: string;
  phone_verified: boolean;
  email: string | null;
  email_verified: boolean;
  locale: Locale;
  theme: Theme;
  created_at: string;

  // Onboarding profile — filled in by the post-signup step wizard, not at signup itself.
  nickname: string | null;
  age: number | null;
  gender: Gender | null;
  country: string;
  city: string | null;
  favorite_sports: Sport[];
  speed_rating: number | null;
  strength_rating: number | null;
  stamina_rating: number | null;
  agility_rating: number | null;
  onboarding_completed: boolean;

  // Saved discoverability location, editable on the profile and reused as the default when
  // publishing a PlayerAvailability.
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
}

/** Reply from every `/verification/email/*` endpoint — deliberately uniform, and deliberately
 * silent about whether a code exists or how many attempts remain. */
export interface VerificationStatus {
  email_verified: boolean;
  detail: string;
}

/** Response of `POST /auth/login` and `POST /auth/signup`. */
export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  country: string;
  city: string | null;
  sport: Sport;
  // The lineup format (e.g. 7v7) — null until a captain sets one at the roster-building stage.
  // Required before `completed` can be set; any OpponentSearch this team publishes inherits it.
  game_type_id: string | null;
  completed: boolean;
  is_adhoc: boolean;
  created_at: string;
}

/** The lineup catalog (e.g. soccer 5v5/6v6/7v7/11v11) a captain picks from for their team. */
export interface GameType {
  id: string;
  sport: Sport;
  label: string;
  players_per_side: number;
}

export interface Membership {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  status: string;
  jersey_number: number | null;
  lineup_position: number | null;
  joined_at: string;
}

export interface RosterSearch {
  id: string;
  team_id: string;
  city: string;
  country: string | null;
  status: ListingStatus;
  expires_at: string;
  created_at: string;
}

export interface RosterApplication {
  id: string;
  roster_search_id: string | null;
  team_id: string;
  user_id: string;
  direction: ApplicationDirection;
  status: ApplicationStatus;
  created_at: string;
}

/** Who pays for and reserves the pitch, declared when the challenge is broadcast. `split_cost` is
 * why this isn't a team id — the negotiation's `booked_by_team_id` can't express "we book but you
 * owe half". */
export type BookingMode = "we_book" | "you_book" | "split_cost";

export const BOOKING_MODES: BookingMode[] = ["we_book", "you_book", "split_cost"];

export interface OpponentSearch {
  id: string;
  team_id: string;
  sport: Sport;
  game_type_id: string;
  city: string;
  country: string | null;
  /** Null when the broadcast left the venue open for the opponent to choose. */
  pitch: string | null;
  pitch_id: string | null;
  date: string; // ISO datetime (date + time)
  /** A second kickoff the publisher would equally accept. Its presence is what makes the date
   * term negotiable — there is no separate flag. */
  date_alt: string | null;
  time_open: boolean;
  booking_mode: BookingMode;
  note: string | null;
  status: ListingStatus;
  expires_at: string;
  created_at: string;
}

export interface OpponentApplication {
  id: string;
  opponent_search_id: string;
  responding_team_id: string;
  status: ApplicationStatus;
  // Live negotiation proposal, present once the challenge is accepted.
  proposed_date: string | null;
  proposed_end_date: string | null;
  proposed_pitch: string | null;
  proposed_pitch_address: string | null;
  proposed_by_team_id: string | null;
  proposed_booked_by_team_id: string | null;
  created_at: string;
}

export interface NegotiationMessage {
  id: string;
  opponent_application_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
}

// One immutable entry in a negotiation's offer history (the seeded initial terms, plus every
// subsequent counter). The application's proposed_* fields only hold the *current* terms.
export interface NegotiationProposal {
  id: string;
  opponent_application_id: string;
  proposed_by_team_id: string;
  date: string;
  end_date: string | null;
  pitch: string;
  pitch_address: string | null;
  booked_by_team_id: string;
  created_at: string;
}

export interface Match {
  id: string;
  opponent_search_id: string;
  team_a_id: string;
  team_b_id: string;
  sport: Sport;
  game_type_id: string;
  city: string;
  pitch: string;
  date: string;
  booked_by_team_id: string;
  status: MatchStatus;
  created_at: string;
}

/** A venue a team has registered — pick one during a negotiation instead of typing a pitch name
 * freehand. Always owned by `team_id`; `is_neutral` is what makes it visible to any negotiation,
 * not just the owning team's own. */
export interface Pitch {
  id: string;
  /** Null for a venue from the seeded public directory, which belongs to no team — that's also
   * what distinguishes a HOME pitch (`team_id === myTeamId`) from a neutral one. */
  team_id: string | null;
  name: string;
  city: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  /** MAD per hour. Null means unknown, and the cost callout hides rather than guessing. */
  price_per_hour: number | null;
  phone: string | null;
  maps_url: string | null;
  is_neutral: boolean;
  created_at: string;
  /** Set only when browsing with `lat`/`lng`; computed per request, never stored. */
  distance_km: number | null;
}

/** Free individual broadcast: "I'm available for <sport> in <city>". */
export interface PlayerAvailability {
  id: string;
  user_id: string;
  sport: Sport;
  city: string;
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
  status: ListingStatus;
  expires_at: string;
  created_at: string;
}

/** Free one-off substitute search, always attached to an already-confirmed match. */
export interface GuestSearch {
  id: string;
  match_id: string;
  team_id: string;
  city: string;
  status: ListingStatus;
  expires_at: string;
  created_at: string;
}

export interface GuestApplication {
  id: string;
  guest_search_id: string | null;
  match_id: string;
  team_id: string;
  user_id: string;
  direction: ApplicationDirection;
  status: ApplicationStatus;
  created_at: string;
}

/** Result of accepting a guest application — participation in one match, not a membership. */
export interface MatchGuestParticipant {
  id: string;
  match_id: string;
  team_id: string;
  user_id: string;
  guest_application_id: string;
  created_at: string;
}
