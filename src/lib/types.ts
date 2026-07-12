export type Profile = {
  id: string;
  email: string;
  username: string;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  starting_balance: number;
  family_friendly: boolean;
  admin_id: string;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  balance: number;
  wins: number;
  losses: number;
  joined_at: string;
};

export type BetCategory = "straight" | "prop" | "over_under";
export type BetStatus = "open" | "settled" | "void";

export type Bet = {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string | null;
  category: BetCategory;
  line: number | null;
  option_a_label: string;
  option_a_odds: number;
  option_b_label: string;
  option_b_odds: number;
  status: BetStatus;
  winning_option: "a" | "b" | null;
  closes_at: string | null;
  created_at: string;
  settled_at: string | null;
};

export type WagerStatus = "open" | "won" | "lost" | "void";

export type Wager = {
  id: string;
  group_id: string;
  user_id: string;
  stake: number;
  combined_odds: number;
  potential_payout: number;
  is_parlay: boolean;
  status: WagerStatus;
  created_at: string;
  settled_at: string | null;
};

export type WagerLeg = {
  id: string;
  wager_id: string;
  bet_id: string;
  selection: "a" | "b";
  odds: number;
  result: "pending" | "won" | "lost" | "void";
};

export type Message = {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type MessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type LeaderboardRow = {
  group_id: string;
  user_id: string;
  username: string;
  balance: number;
  at_stake: number;
  total_worth: number;
  wins: number;
  losses: number;
};

// A pending selection in the on-screen bet slip
export type SlipLeg = {
  bet: Bet;
  selection: "a" | "b";
};
