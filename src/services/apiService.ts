import { Reservation, AvailableSlot, SlotResponse } from '../types';

/**
 * GAS環境かローカル開発環境かを判定して、適切なAPIを呼び出すサービス
 */

const isGas = typeof google !== 'undefined' && google.script && google.script.run;
const gasUrl = import.meta.env.VITE_GAS_URL;

async function callGasApi(action: string, data?: any): Promise<any> {
  if (isGas) {
    return new Promise((resolve, reject) => {
      (google.script.run as any)
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)[action](data);
    });
  }

  if (gasUrl) {
    const isMutation = !action.startsWith('get');
    if (isMutation) {
      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, ...data })
      });
      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error('GASからの応答が不正です。URLが正しいか確認してください。');
      }
      if (result.error) throw new Error(result.error);
      return result;
    } else {
      const params = new URLSearchParams({ action, ...data });
      const res = await fetch(`${gasUrl}?${params.toString()}`);
      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error('GASからの応答が不正です。URLが正しいか確認してください。');
      }
      if (result.error) throw new Error(result.error);
      return result;
    }
  }

  return null;
}

export const apiService = {
  getReservations: async (month: string): Promise<Reservation[]> => {
    const remoteData = await callGasApi('getReservations', { month });
    if (remoteData !== null) return remoteData;

    const res = await fetch(`/api/reservations?month=${month}`);
    return res.json();
  },

  addReservation: async (reservation: Omit<Reservation, 'id'>): Promise<{ id: string }> => {
    const remoteData = await callGasApi('addReservation', { data: reservation });
    if (remoteData !== null) return remoteData;

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
    const remoteData = await callGasApi('deleteReservation', { id });
    if (remoteData !== null) return;

    const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error('Failed to delete reservation');
    }
  },

  getAvailableSlots: async (): Promise<SlotResponse> => {
    const remoteData = await callGasApi('getAvailableSlots');
    if (remoteData !== null) return remoteData;

    const res = await fetch('/api/available-slots');
    return res.json();
  },

  addAvailableSlot: async (slot: Omit<AvailableSlot, 'id'>): Promise<void> => {
    const remoteData = await callGasApi('addAvailableSlot', { data: slot });
    if (remoteData !== null) return;

    await fetch('/api/available-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slot)
    });
  },

  deleteAvailableSlot: async (id: number | string): Promise<void> => {
    const remoteData = await callGasApi('deleteAvailableSlot', { id });
    if (remoteData !== null) return;

    await fetch(`/api/available-slots/${id}`, { method: 'DELETE' });
  },

  addExtraSlot: async (date: string, startTime: string): Promise<void> => {
    const remoteData = await callGasApi('addExtraSlot', { data: { date, startTime } });
    if (remoteData !== null) return;

    await fetch('/api/extra-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime })
    });
  },

  deleteExtraSlot: async (date: string, startTime: string): Promise<void> => {
    const remoteData = await callGasApi('deleteExtraSlot', { data: { date, startTime } });
    if (remoteData !== null) return;

    await fetch('/api/extra-slots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime })
    });
  },

  addBlockedSlot: async (date: string, startTime: string): Promise<void> => {
    const remoteData = await callGasApi('addBlockedSlot', { data: { date, startTime } });
    if (remoteData !== null) return;

    await fetch('/api/blocked-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime })
    });
  },

  deleteBlockedSlot: async (date: string, startTime: string): Promise<void> => {
    const remoteData = await callGasApi('deleteBlockedSlot', { data: { date, startTime } });
    if (remoteData !== null) return;

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
