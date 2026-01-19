
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, Booking, AvailabilityRule, SpecialSchedule } from './types';
import { DEFAULT_RULES, DAYS_OF_WEEK } from './constants';
import { 
  MusicalNoteIcon, Cog6ToothIcon, PlusIcon, TrashIcon, 
  ChevronLeftIcon, ChevronRightIcon, PencilSquareIcon, ArrowPathIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { 
  format, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isPast, 
  getDay 
} from 'date-fns';
import { ja } from 'date-fns/locale';

// 設定済みのGAS URL
const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxE2yxvOsFM-ReaI2kYCQj4UrVWqj0VdKly61x_l9fnPCwpkxTetmUTtjpEopHvu5GA/exec"; 

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>(DEFAULT_RULES);
  const [specialSchedules, setSpecialSchedules] = useState<SpecialSchedule[]>([]);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const fetchCloudData = async () => {
    if (!GAS_WEBAPP_URL) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(GAS_WEBAPP_URL);
      const data = await response.json();
      if (data.bookings) setBookings(data.bookings);
      if (data.rules) setRules(data.rules);
      if (data.specialSchedules) setSpecialSchedules(data.specialSchedules);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToCloud = async (newBookings: Booking[], newRules: AvailabilityRule[], newSpecials: SpecialSchedule[]) => {
    if (!GAS_WEBAPP_URL) return;
    setIsSyncing(true);
    try {
      await fetch(GAS_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          bookings: newBookings,
          rules: newRules,
          specialSchedules: newSpecials
        }),
      });
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  useEffect(() => { fetchCloudData(); }, []);

  const updateAndSync = (newBookings: Booking[], newRules: AvailabilityRule[], newSpecials: SpecialSchedule[]) => {
    setBookings(newBookings);
    setRules(newRules);
    setSpecialSchedules(newSpecials);
    saveToCloud(newBookings, newRules, newSpecials);
  };

  const handleAddBooking = (date: string, timeSlot: string, bandName: string) => {
    if (!bandName.trim()) {
      alert("バンド名を入力してください");
      return;
    }
    const alreadyBooked = bookings.some(b => b.date === date && b.timeSlot === timeSlot);
    if (alreadyBooked) {
      alert("既に予約されています");
      return;
    }
    const newBookings = [...bookings, {
      id: `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date, timeSlot, bandName, createdAt: Date.now()
    }];
    updateAndSync(newBookings, rules, specialSchedules);
    const input = document.getElementById(`band-${timeSlot}`) as HTMLInputElement;
    if (input) input.value = '';
  };

  const executeDelete = (id: string) => {
    const newBookings = bookings.filter(b => b.id !== id);
    updateAndSync(newBookings, rules, specialSchedules);
    setConfirmingDeleteId(null);
  };

  const addSpecialSlot = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const newSlot = prompt("この日に追加する時間枠 (例: 15:00-16:00)");
    if (!newSlot) return;
    let newSpecials = [...specialSchedules];
    const existing = newSpecials.find(s => s.date === dateStr);
    if (existing) {
      newSpecials = newSpecials.map(s => s.date === dateStr ? { ...s, slots: [...s.slots, newSlot].sort() } : s);
    } else {
      const baseSlots = getSlotsForDate(date);
      newSpecials.push({ date: dateStr, slots: [...baseSlots, newSlot].sort(), isDisabled: false });
    }
    updateAndSync(bookings, rules, newSpecials);
  };

  const removeSpecialSlot = (date: Date, slotToRemove: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let newSpecials = [...specialSchedules];
    const existing = newSpecials.find(s => s.date === dateStr);
    const baseSlots = existing ? existing.slots : getSlotsForDate(date);
    const updatedSlots = baseSlots.filter(s => s !== slotToRemove);
    if (existing) {
      newSpecials = newSpecials.map(s => s.date === dateStr ? { ...s, slots: updatedSlots, isDisabled: updatedSlots.length === 0 } : s);
    } else {
      newSpecials.push({ date: dateStr, slots: updatedSlots, isDisabled: updatedSlots.length === 0 });
    }
    updateAndSync(bookings, rules, newSpecials);
  };

  const resetSpecialDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (confirm("通常のスケジュールに戻しますか？")) {
      const newSpecials = specialSchedules.filter(s => s.date !== dateStr);
      updateAndSync(bookings, rules, newSpecials);
    }
  };

  const startOfMonthNative = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const addMonthsNative = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const subMonthsNative = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() - amount, 1);

  const days = useMemo(() => {
    const start = startOfMonthNative(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getSlotsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const special = specialSchedules.find(s => s.date === dateStr);
    if (special) return special.isDisabled ? [] : special.slots;
    const dayOfWeek = getDay(date);
    const rule = rules.find(r => r.dayOfWeek === dayOfWeek);
    return rule ? rule.slots : [];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        <p className="text-slate-500 font-bold animate-pulse tracking-widest">データを同期中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-indigo-700 text-white p-4 shadow-md sticky top-0 z-40 flex justify-between items-center px-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <MusicalNoteIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight uppercase leading-none">軽音班 講堂予約</h1>
            <div className="flex items-center gap-2 mt-1">
               <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
               <span className="text-[9px] text-indigo-100 font-bold uppercase tracking-wider">
                 {isSyncing ? '同期中' : 'クラウド同期完了'}
               </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setRole(role === 'STUDENT' ? 'ADVISOR' : 'STUDENT')}
            className={`px-3 py-1.5 rounded-full text-[10px] md:text-xs font-black transition-all shadow-sm ${
              role === 'ADVISOR' ? 'bg-amber-400 text-slate-900 scale-105' : 'bg-indigo-600 border border-indigo-500 hover:bg-indigo-500'
            }`}
          >
            {role === 'ADVISOR' ? '顧問' : '生徒'}
          </button>
          <button onClick={fetchCloudData} title="最新化" className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowPathIcon className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          {role === 'ADVISOR' && (
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Cog6ToothIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <button onClick={() => setCurrentMonth(subMonthsNative(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeftIcon className="w-6 h-6" /></button>
          <h2 className="text-xl font-black text-slate-800 tracking-tighter">{format(currentMonth, 'yyyy年 MMMM', { locale: ja })}</h2>
          <button onClick={() => setCurrentMonth(addMonthsNative(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRightIcon className="w-6 h-6" /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className={`p-3 text-center text-[10px] font-black uppercase tracking-widest ${d === '日' ? 'text-red-400' : d === '土' ? 'text-indigo-400' : 'text-slate-400'}`}>
              {d}
            </div>
          ))}
          {Array.from({ length: getDay(startOfMonthNative(currentMonth)) }).map((_, i) => <div key={`empty-${i}`} className="bg-slate-200/20 rounded-xl h-32 md:h-40" />)}
          {days.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const slots = getSlotsForDate(date);
            const dateBookings = bookings.filter(b => b.date === dateStr);
            const isToday = isSameDay(date, new Date());
            const past = isPast(date) && !isToday;
            const hasSpecial = specialSchedules.some(s => s.date === dateStr);

            return (
              <div 
                key={date.toString()} 
                className={`bg-white min-h-[8rem] md:min-h-[10rem] p-3 rounded-2xl border transition-all hover:shadow-md hover:border-indigo-200 cursor-pointer relative group ${past ? 'opacity-40 grayscale-[0.5]' : 'border-slate-100 shadow-sm'}`}
                onClick={() => { if (!past) { setSelectedDate(date); setIsBookingModalOpen(true); } }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                    {format(date, 'd')}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    {slots.length > 0 && !past && <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black border border-emerald-100">枠有</span>}
                    {hasSpecial && <span className="text-[9px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-black border border-amber-100">変則</span>}
                  </div>
                </div>
                <div className="space-y-1">
                  {dateBookings.sort((a,b) => a.timeSlot.localeCompare(b.timeSlot)).map(b => (
                    <div key={b.id} className="text-[10px] p-1.5 bg-indigo-50/50 text-indigo-700 rounded-lg truncate border border-indigo-100 font-bold">
                      <span className="opacity-50 mr-1">{b.timeSlot.split(':')[0]}時</span>{b.bandName}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 予約モーダル */}
      {isBookingModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-indigo-700 p-8 text-white flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-black tracking-tight">{format(selectedDate, 'M月 d日 (E)', { locale: ja })}</h3>
                <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest">Reservation</p>
              </div>
              <button onClick={() => { setIsBookingModalOpen(false); setConfirmingDeleteId(null); }} className="relative z-10 p-2 hover:bg-white/10 rounded-full transition-colors">✕</button>
              <MusicalNoteIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
            </div>
            
            <div className="p-8 space-y-5 max-h-[60vh] overflow-y-auto">
              {role === 'ADVISOR' && (
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 mb-6">
                  <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">顧問：この日限定の設定</h4>
                  <div className="flex gap-3">
                    <button onClick={() => addSpecialSlot(selectedDate)} className="flex-1 bg-white border border-amber-300 text-amber-700 py-2.5 rounded-xl text-xs font-black hover:bg-amber-100 shadow-sm transition-all active:scale-95">枠追加</button>
                    {specialSchedules.some(s => s.date === format(selectedDate, 'yyyy-MM-dd')) && (
                      <button onClick={() => resetSpecialDay(selectedDate)} className="flex-1 bg-white border border-slate-300 text-slate-500 py-2.5 rounded-xl text-xs font-black hover:bg-slate-100 shadow-sm transition-all active:scale-95">元に戻す</button>
                    )}
                  </div>
                </div>
              )}

              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">Time Slots</label>
              {getSlotsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-12 px-4 italic text-slate-400 font-bold">予約枠がありません</div>
              ) : (
                getSlotsForDate(selectedDate).map(slot => {
                  const dateStr = format(selectedDate, 'yyyy-MM-dd');
                  const booking = bookings.find(b => b.date === dateStr && b.timeSlot === slot);
                  return (
                    <div key={slot} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${booking ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-100 bg-white hover:border-indigo-100'}`}>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 tracking-tight">{slot}</span>
                        {role === 'ADVISOR' && !booking && (
                          <button onClick={() => removeSpecialSlot(selectedDate, slot)} className="text-[10px] text-red-500 font-black hover:underline text-left mt-1">消去</button>
                        )}
                      </div>
                      {booking ? (
                        <div className="flex items-center gap-2">
                          {confirmingDeleteId === booking.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => executeDelete(booking.id)} className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black">確定</button>
                              <button onClick={() => setConfirmingDeleteId(null)} className="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-black">取消</button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-black text-indigo-700 bg-white border border-indigo-100 px-4 py-2 rounded-xl shadow-sm">{booking.bandName}</span>
                              <button onClick={() => setConfirmingDeleteId(booking.id)} className="p-2 text-slate-300 hover:text-red-600 rounded-xl transition-all"><TrashIcon className="w-5 h-5" /></button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input type="text" placeholder="バンド名" id={`band-${slot}`} className="px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-32 shadow-sm font-bold" />
                          <button onClick={() => handleAddBooking(dateStr, slot, (document.getElementById(`band-${slot}`) as HTMLInputElement).value)} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all">
                            <PlusIcon className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => { setIsBookingModalOpen(false); setConfirmingDeleteId(null); }} className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black shadow-sm hover:bg-slate-100 transition-all active:scale-95">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* 週間設定モーダル */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-amber-500 p-8 text-white shrink-0 relative overflow-hidden">
              <h3 className="text-2xl font-black tracking-tight relative z-10">週間スケジュールの管理</h3>
              <p className="text-amber-100 text-sm font-bold uppercase tracking-widest relative z-10">Weekly Settings</p>
              <Cog6ToothIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
            </div>
            <div className="p-8 space-y-6 overflow-y-auto">
              {DAYS_OF_WEEK.map((day, idx) => {
                const rule = rules.find(r => r.dayOfWeek === idx);
                return (
                  <div key={day} className="flex flex-col md:flex-row md:items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="w-16 font-black text-slate-700 text-lg">{day}曜</span>
                    <div className="flex flex-wrap gap-2 flex-grow">
                      {rule?.slots.map(slot => (
                        <span key={slot} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-3 shadow-sm group">
                          {slot}
                          <button onClick={() => {
                            const newRules = rules.map(r => r.dayOfWeek === idx ? { ...r, slots: r.slots.filter(s => s !== slot) } : r);
                            updateAndSync(bookings, newRules, specialSchedules);
                          }} className="text-slate-300 hover:text-red-500 transition-colors">✕</button>
                        </span>
                      ))}
                      <button onClick={() => {
                        const newSlot = prompt("例: 16:00-17:00");
                        if (newSlot) {
                          const newRules = [...rules];
                          const existing = newRules.find(r => r.dayOfWeek === idx);
                          if (existing) { existing.slots = [...existing.slots, newSlot].sort(); }
                          else { newRules.push({ dayOfWeek: idx, slots: [newSlot] }); }
                          updateAndSync(bookings, newRules, specialSchedules);
                        }
                      }} className="bg-white border-2 border-dashed border-amber-300 text-amber-700 px-4 py-2 rounded-xl text-sm font-black hover:bg-amber-50">+ 追加</button>
                    </div>
                  </div>
                );
              })}
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mt-8">
                <button onClick={() => { if(confirm("初期化しますか？")) { updateAndSync([], DEFAULT_RULES, []); } }} className="bg-red-600 text-white px-8 py-3 rounded-2xl text-sm font-black shadow-lg">全データを消去</button>
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 flex justify-end bg-slate-50">
              <button onClick={() => setIsSettingsModalOpen(false)} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all active:scale-95">完了</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
