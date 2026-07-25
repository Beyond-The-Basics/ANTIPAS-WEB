export type Sport = "soccer" | "tennis" | "paddle";
export type TeamRole = "captain" | "admin" | "member";
export type ListingStatus = "open" | "closed" | "confirmed" | "withdrawn" | "expired";
export type ApplicationStatus = "pending" | "confirmed" | "declined" | "withdrawn";
export type ApplicationDirection = "player_applied" | "team_invited";
export type MatchStatus = "confirmed" | "cancelled_by_a" | "cancelled_by_b" | "played";

export const SPORTS: Sport[] = ["soccer", "tennis", "paddle"];

export interface User {
  id: string;
  name: string;
  phone: string;
  phone_verified: boolean;
  email: string | null;
  email_verified: boolean;
  created_at: string;

  // Onboarding profile — filled in by the post-signup step wizard, not at signup itself.
  nickname: string | null;
  age: number | null;
  country: string;
  city: string | null;
  favorite_sports: Sport[];
  speed_rating: number | null;
  strength_rating: number | null;
  stamina_rating: number | null;
  agility_rating: number | null;
  onboarding_completed: boolean;
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
  logo_url: string | null;
  sport: Sport;
  completed: boolean;
  is_adhoc: boolean;
  created_at: string;
}

export interface Membership {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  status: string;
  joined_at: string;
}

export interface RosterSearch {
  id: string;
  team_id: string;
  city: string;
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

export interface OpponentSearch {
  id: string;
  team_id: string;
  sport: Sport;
  game_type_id: string;
  city: string;
  pitch: string;
  date: string;
  status: ListingStatus;
  expires_at: string;
  created_at: string;
}

export interface OpponentApplication {
  id: string;
  opponent_search_id: string;
  responding_team_id: string;
  status: ApplicationStatus;
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
  status: MatchStatus;
  created_at: string;
}

/** Free individual broadcast: "I'm available for <sport> in <city>". */
export interface PlayerAvailability {
  id: string;
  user_id: string;
  sport: Sport;
  city: string;
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
