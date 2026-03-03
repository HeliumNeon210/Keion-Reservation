import { Reservation, AvailableSlot, SlotResponse } from '../types';

/**
 * GAS環境かローカル開発環境かを判定して、適切なAPIを呼び出すサービス
 */

const isGas = typeof google !== 'undefined' && google.script && google.script.run;

function runGas(functionName: string, ...args: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!isGas) {
      reject(new Error('GAS environment not found'));
      return;
    }
    (google.script.run as any)
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)[functionName](...args);
  });
}

export const apiService = {
  getReservations: async (month: string): Promise<Reservation[]> => {
    if (isGas) {
      return runGas('getReservations', month);
    }
    const res = await fetch(`/api/reservations?month=${month}`);
    return res.json();
  },

  addReservation: async (reservation: Omit<Reservation, 'id'>): Promise<{ id: string }> => {
    if (isGas) {
      const id = await runGas('addReservation', reservation);
      return { id };
    }
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
    if (isGas) {
      await runGas('deleteReservation', id);
      return;
    }
    const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error('Failed to delete reservation');
    }
  },

  getAvailableSlots: async (): Promise<SlotResponse> => {
    if (isGas) {
      return runGas('getAvailableSlots');
    }
    const res = await fetch('/api/available-slots');
    return res.json();
  },

  addAvailableSlot: async (slot: Omit<AvailableSlot, 'id'>): Promise<void> => {
    if (isGas) {
      await runGas('addAvailableSlot', slot);
      return;
    }
    await fetch('/api/available-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slot)
    });
  },

  deleteAvailableSlot: async (id: number | string): Promise<void> => {
    if (isGas) {
      await runGas('deleteAvailableSlot', id);
      return;
    }
    await fetch(`/api/available-slots/${id}`, { method: 'DELETE' });
  },

  addExtraSlot: async (date: string, startTime: string): Promise<void> => {
    if (isGas) {
      await runGas('addExtraSlot', date, startTime);
      return;
    }
    await fetch('/api/extra-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime })
    });
  },

  deleteExtraSlot: async (date: string, startTime: string): Promise<void> => {
    if (isGas) {
      await runGas('deleteExtraSlot', date, startTime);
      return;
    }
    await fetch('/api/extra-slots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime })
    });
  },

  addBlockedSlot: async (date: string, startTime: string): Promise<void> => {
    if (isGas) {
      await runGas('addBlockedSlot', date, startTime);
      return;
    }
    await fetch('/api/blocked-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime })
    });
  },

  deleteBlockedSlot: async (date: string, startTime: string): Promise<void> => {
    if (isGas) {
      await runGas('deleteBlockedSlot', date, startTime);
      return;
    }
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
