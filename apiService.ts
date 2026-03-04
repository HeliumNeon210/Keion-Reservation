import { Reservation, AvailableSlot, SlotResponse } from '../types';

/**
 * GAS環境かローカル開発環境かを判定して、適切なAPIを呼び出すサービス
 */

const isGas = typeof google !== 'undefined' && google.script && google.script.run;
const gasUrl = import.meta.env.VITE_GAS_URL;

async function callGasApi(action: string, params: any = {}): Promise<any> {
  if (isGas) {
    return new Promise((resolve, reject) => {
      (google.script.run as any)
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .handleApiRequest(action, params);
    });
  }

  if (gasUrl && gasUrl.trim() !== '') {
    // GAS Web Appへの外部アクセス
    try {
      const res = await fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify({ action, ...params }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (e: any) {
      console.error('GAS API Error:', e);
      throw new Error(`GASとの通信に失敗しました: ${e.message}`);
    }
  }

  // ローカル開発用（server.ts経由）
  return null; // 後続のロジックで処理
}

export const apiService = {
  getReservations: async (month: string): Promise<Reservation[]> => {
    const gasRes = await callGasApi('getReservations', { month });
    if (gasRes !== null) return gasRes;

    const res = await fetch(`/api/reservations?month=${month}`);
    return res.json();
  },

  addReservation: async (reservation: Omit<Reservation, 'id'>): Promise<{ id: string }> => {
    const gasRes = await callGasApi('addReservation', { reservation });
    if (gasRes !== null) return gasRes;

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservation)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to add reservation');
    }
    return res.json();
  },

  deleteReservation: async (id: number | string): Promise<void> => {
    const gasRes = await callGasApi('deleteReservation', { id });
    if (gasRes !== null) return;

    const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error('Failed to delete reservation');
    }
  },

  getAvailableSlots: async (): Promise<SlotResponse> => {
    const gasRes = await callGasApi('getAvailableSlots');
    if (gasRes !== null) return gasRes;

    const res = await fetch('/api/available-slots');
    return res.json();
  },

  addAvailableSlot: async (slot: Omit<AvailableSlot, 'id'>): Promise<void> => {
    const gasRes = await callGasApi('addAvailableSlot', { slot });
    if (gasRes !== null) return;

    await fetch('/api/available-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slot)
    });
  },

  deleteAvailableSlot: async (id: number | string): Promise<void> => {
    const gasRes = await callGasApi('deleteAvailableSlot', { id });
    if (gasRes !== null) return;

    await fetch(`/api/available-slots/${id}`, { method: 'DELETE' });
  },

  addExtraSlot: async (date: string, startTime: string): Promise<void> => {
    const gasRes = await callGasApi('addExtraSlot', { date, startTime });
    if (gasRes !== null) return;

    await fetch('/api/extra-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime })
    });
  },

  deleteExtraSlot: async (date: string, startTime: string): Promise<void> => {
    const gasRes = await callGasApi('deleteExtraSlot', { date, startTime });
    if (gasRes !== null) return;

    await fetch('/api/extra-slots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime })
    });
  },

  addBlockedSlot: async (date: string, startTime: string): Promise<void> => {
    const gasRes = await callGasApi('addBlockedSlot', { date, startTime });
    if (gasRes !== null) return;

    await fetch('/api/blocked-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime })
    });
  },

  deleteBlockedSlot: async (date: string, startTime: string): Promise<void> => {
    const gasRes = await callGasApi('deleteBlockedSlot', { date, startTime });
    if (gasRes !== null) return;

    await fetch('/api/blocked-slots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime })
    });
  }
};

// GAS環境用の型定義
declare const google: {
  script: {
    run: {
      withSuccessHandler(handler: (result: any) => void): any;
      withFailureHandler(handler: (error: any) => void): any;
    };
  };
};
