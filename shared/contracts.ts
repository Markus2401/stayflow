export type Role = 'owner' | 'manager' | 'reception' | 'operations';
export type Property = { id: string; name: string; role: Role };
export type RoomStatus = 'available' | 'occupied' | 'out_of_service';
export type Room = { id: string; label: string; status: RoomStatus; guest: string | null; expectedDeparture: string | null };
export type SessionState = { csrf: string; session: { properties: Property[] } | null };
