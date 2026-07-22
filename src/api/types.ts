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
  created_at: string;
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
