export type Shift = {
  date: string;
  label: string;
  hours: number;
  pay: number;
  color: string;
  note: string;
};

export type Me = { id: string; name: string; picture: string | null; is_admin: boolean; position_code: string | null };

export type PayPosition = { code: string; name: string; sort: number };
export type PayRate = { position_code: string; shift: string; pay: number; per_hours: number; note: string };

export type Message = { id: string; body: string; reply: string | null; created_at: string; replied_at: string | null };
export type AdminMessage = Message & { user_id: string; name: string; picture: string | null };

export type HoroProfile = { birth_date: string; birth_time: string | null; share_with_groups: boolean };
export type GroupHoro = { id: string; name: string; picture: string | null; birth_date: string };

export type Group = { id: string; name: string; invite_code: string; is_owner: boolean; member_count: number };

export type GroupMemberDay = {
  id: string;
  name: string;
  picture: string | null;
  label: string | null;
  color: string | null;
  hours: number | null;
};

export type IncomeMonth = { month: string; shifts: number; hours: number; pay: number };

export const PRESETS: Pick<Shift, "label" | "hours" | "color">[] = [
  { label: "เช้า", hours: 8, color: "#f5b82e" },
  { label: "บ่าย", hours: 8, color: "#e8603c" },
  { label: "ดึก", hours: 8, color: "#2b3a67" },
  { label: "OT", hours: 4, color: "#1f9d8a" },
  { label: "หยุด", hours: 0, color: "#c5cdc9" },
];
