import { http } from './http';

export interface LookupItem {
  id: number;
  name: string;
}

async function normalizeListResponse(res: unknown): Promise<unknown[]> {
  if (!res) return [];
  // try to access res.data safely
  const maybe = res as { data?: unknown };
  let data: unknown[] = [];
  if (maybe.data) {
    if (Array.isArray(maybe.data)) {
      data = maybe.data as unknown[];
    } else if (typeof maybe.data === 'object' && maybe.data !== null) {
      const nested = (maybe.data as Record<string, unknown>)['data'];
      if (Array.isArray(nested)) data = nested;
    }
  }
  return data;
}

export async function getOccupations(): Promise<LookupItem[]> {
  try {
    const res = await http.get('/api/lookups/occupations');
    const list = await normalizeListResponse(res);
    return list.map((o) => {
      const obj = o as Record<string, unknown>;
      return { id: Number(obj['id']), name: String(obj['name']) };
    });
  } catch (e) {
    console.warn('getOccupations failed', e);
    return [];
  }
}

export async function getNationalities(): Promise<LookupItem[]> {
  try {
    const res = await http.get('/api/lookups/nationalities');
    const list = await normalizeListResponse(res);
    return list.map((o) => {
      const obj = o as Record<string, unknown>;
      return { id: Number(obj['id']), name: String(obj['name']) };
    });
  } catch (e) {
    console.warn('getNationalities failed', e);
    return [];
  }
}

export async function getCustomerGroups(): Promise<LookupItem[]> {
  try {
    const res = await http.get('/api/lookups/customer-groups');
    const list = await normalizeListResponse(res);
    return list.map((o) => {
      const obj = o as Record<string, unknown>;
      return { id: Number(obj['id']), name: String(obj['name']) };
    });
  } catch (e) {
    console.warn('getCustomerGroups failed', e);
    return [];
  }
}

export default {
  getOccupations,
  getNationalities,
  getCustomerGroups,
};
