import { Reservation, AvailableSlot, SlotResponse } from '../types';

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

  if (!gasUrl) {
    console.warn('VITE_GAS_URL is not set. API calls will fail.');
    return null;
  }

  const isMutation = !action.startsWith('get');
  try {
    if (isMutation) {
      // 確実にJSONとして送信し、GAS側でパースしやすくする
      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data }) // dataプロパティに包んで送る
      });
      const text = await res.text();
      const result = JSON.parse(text);
      if (result.error) throw new Error(result.error);
      return result;
    } else {
      const params = new URLSearchParams({ action, ...data });
      const res = await fetch(`${gasUrl}?${params.toString()}`);
      const text = await res.text();
      const result = JSON.parse(text);
      if (result.error) throw new Error(result.error);
      return result;
    }
  } catch (e: any) {
    console.error(`API Error (${action}):`, e);
    throw e;
  }
}

export const apiService = {
  getReservations: (month: string) => callGasApi('getReservations', { month }),
  addReservation: (data: any) => callGasApi('addReservation', { data }),
  deleteReservation: (id: any) => callGasApi('deleteReservation', { id }),
  getAvailableSlots: () => callGasApi('getAvailableSlots'),
  addAvailableSlot: (data: any) => callGasApi('addAvailableSlot', { data }),
  deleteAvailableSlot: (id: any) => callGasApi('deleteAvailableSlot', { id }),
  addExtraSlot: (date: string, startTime: string) => callGasApi('addExtraSlot', { data: { date, startTime } }),
  deleteExtraSlot: (date: string, startTime: string) => callGasApi('deleteExtraSlot', { data: { date, startTime } }),
  addBlockedSlot: (date: string, startTime: string) => callGasApi('addBlockedSlot', { data: { date, startTime } }),
  deleteBlockedSlot: (date: string, startTime: string) => callGasApi('deleteBlockedSlot', { data: { date, startTime } }),
};

declare const google: any;
