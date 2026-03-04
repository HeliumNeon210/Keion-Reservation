import React, { useState, useEffect, useCallback } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  getDay,
  parseISO,
  isValid
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Music, 
  Users, 
  Clock, 
  Plus, 
  Trash2, 
  RefreshCw,
  Settings,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { Reservation, SlotResponse } from './types';
import { apiService } from './services/apiService';

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [slotData, setSlotData] = useState<SlotResponse>({ recurring: [], extra: [], blocked: [] });
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [addingSlotDay, setAddingSlotDay] = useState<number | null>(null);
  const [newSlotTime, setNewSlotTime] = useState('');

  // 時間を "HH:mm" 形式に厳格に統一する関数
  const normalizeTime = (timeStr: any) => {
    if (!timeStr) return '';
    const str = String(timeStr).trim();
    
    // ISO形式 (T...Z) の場合
    if (str.includes('T')) {
      try {
        const date = new Date(str);
        if (isValid(date)) return format(date, 'HH:mm');
      } catch (e) {}
    }
    
    // "HH:mm:ss" または "H:m" 形式を "HH:mm" に変換
    const parts = str.split(':');
    if (parts.length >= 2) {
      const h = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      return `${h}:${m}`;
    }
    return str;
  };

  // 日付を "yyyy-MM-dd" 形式に厳格に統一する関数
  const normalizeDate = (dateVal: any) => {
    if (!dateVal) return '';
    if (dateVal instanceof Date) return format(dateVal, 'yyyy-MM-dd');
    
    const str = String(dateVal).trim();
    // YYYY/MM/DD を YYYY-MM-DD に変換
    const normalized = str.replace(/\//g, '-').split('T')[0];
    
    // 形式チェック (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    
    // それ以外は Date オブジェクト変換を試みる
    try {
      const d = new Date(str);
      if (isValid(d)) return format(d, 'yyyy-MM-dd');
    } catch (e) {}
    
    return normalized;
  };

  useEffect(() => {
    if (logoTapCount >= 4) {
      setIsAdmin(prev => !prev);
      setLogoTapCount(0);
    }
    const timer = setTimeout(() => setLogoTapCount(0), 2000);
    return () => clearTimeout(timer);
  }, [logoTapCount]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStr = format(currentDate, 'yyyy-MM');
      const [resData, slotsData] = await Promise.all([
        apiService.getReservations(monthStr),
        apiService.getAvailableSlots()
      ]);
      
      const cleanedReservations = (Array.isArray(resData) ? resData : [])
        .filter(r => r && typeof r === 'object')
        .map(r => ({
          ...r,
          date: normalizeDate(r.date),
          startTime: normalizeTime(r.startTime)
        }));
      
      const cleanedSlots = {
        recurring: (Array.isArray(slotsData?.recurring) ? slotsData.recurring : [])
          .map(s => ({ ...s, startTime: normalizeTime(s?.startTime) })),
        extra: (Array.isArray(slotsData?.extra) ? slotsData.extra : [])
          .map(s => ({ ...s, date: normalizeDate(s?.date), startTime: normalizeTime(s?.startTime) })),
        blocked: (Array.isArray(slotsData?.blocked) ? slotsData.blocked : [])
          .map(s => ({ ...s, date: normalizeDate(s?.date), startTime: normalizeTime(s?.startTime) }))
      };

      setReservations(cleanedReservations);
      setSlotData(cleanedSlots);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  const calculateActualSlots = useCallback((date: Date) => {
    const dayOfWeek = getDay(date);
    const dateStr = normalizeDate(date);
    
    let slots = (slotData?.recurring || [])
      .filter(s => s && s.dayOfWeek === dayOfWeek)
      .map(s => normalizeTime(s.startTime));
      
    const blockedTimes = (slotData?.blocked || [])
      .filter(s => s && normalizeDate(s.date) === dateStr)
      .map(s => normalizeTime(s.startTime));
    slots = slots.filter(time => !blockedTimes.includes(time));
    
    const extraTimes = (slotData?.extra || [])
      .filter(s => s && normalizeDate(s.date) === dateStr)
      .map(s => normalizeTime(s.startTime));
    slots = [...new Set([...slots, ...extraTimes])];
    
    return slots.sort();
  }, [slotData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  const handleDeleteReservation = async (id: number | string) => {
    if (!confirm('この予約を削除しますか？')) return;
    try {
      await apiService.deleteReservation(id);
      fetchData();
    } catch (error) {
      alert('削除に失敗しました。');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <header className="bg-[#4F46E5] text-white p-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setLogoTapCount(prev => prev + 1)}>
            <div className="bg-white/20 p-2 rounded-xl"><Music className="w-6 h-6" /></div>
            <div>
              <h1 className="font-bold text-lg leading-tight">軽音班予約</h1>
              <div className="flex items-center gap-1.5 text-xs opacity-80">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />ONLINE
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 hover:bg-white/10 rounded-full transition-colors" disabled={isLoading}>
              <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
            </button>
            {isAdmin && (
              <button onClick={() => setIsAdmin(false)} className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-sm font-bold transition-all flex items-center gap-1">
                <X className="w-4 h-4" />管理者終了
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-6 flex items-center justify-between">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button>
          <h2 className="text-2xl font-bold tracking-tight">{format(currentDate, 'yyyy年 M月', { locale: ja })}</h2>
          <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight className="w-6 h-6" /></button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
              <div key={day} className={cn("py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest", i === 0 && "text-rose-400", i === 6 && "text-sky-400")}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {renderCalendarDays(currentDate, reservations, slotData, calculateActualSlots, handleDayClick, normalizeDate, normalizeTime)}
          </div>
        </div>

        {isAdmin && (
          <div className="mt-8 p-6 bg-amber-50 rounded-3xl border border-amber-200 text-amber-800">
            <h3 className="font-bold flex items-center gap-2 mb-2"><Settings className="w-5 h-5" />管理者モード</h3>
            <p className="text-sm">カレンダーの日付をクリックして、臨時枠の追加や削除ができます。</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isModalOpen && selectedDate && (
          <ReservationModal 
            date={selectedDate}
            isAdmin={isAdmin}
            reservations={reservations.filter(r => normalizeDate(r.date) === normalizeDate(selectedDate))}
            actualSlots={calculateActualSlots(selectedDate)}
            slotData={slotData}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => { setIsModalOpen(false); fetchData(); }}
            onDelete={handleDeleteReservation}
            onRefresh={fetchData}
            normalizeDate={normalizeDate}
            normalizeTime={normalizeTime}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function renderCalendarDays(currentDate: Date, reservations: Reservation[], slotData: SlotResponse, calculateActualSlots: (date: Date) => string[], onDayClick: (day: Date) => void, normalizeDate: (d: any) => string, normalizeTime: (t: any) => string) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = [];
  let day = startDate;
  while (day <= endDate) { calendarDays.push(day); day = addDays(day, 1); }

  return calendarDays.map((day) => {
    const formattedDate = normalizeDate(day);
    const dayReservations = reservations.filter(r => normalizeDate(r.date) === formattedDate);
    const actualSlots = calculateActualSlots(day);
    const isCurrentMonth = isSameMonth(day, monthStart);
    const isToday = isSameDay(day, new Date());

    return (
      <div key={day.toString()} onClick={() => onDayClick(day)} className={cn("min-h-[110px] p-2 border-r border-b border-slate-100 relative cursor-pointer transition-all hover:bg-indigo-50/30 group", !isCurrentMonth && "bg-slate-50/50 opacity-30")}>
        <div className="flex justify-between items-start mb-1">
          <span className={cn("text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full", isToday ? "bg-[#4F46E5] text-white" : "text-slate-400 group-hover:text-slate-600")}>{format(day, 'd')}</span>
          {actualSlots.length > 0 && dayReservations.length < actualSlots.length && (
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          )}
        </div>
        <div className="space-y-1 mt-1">
          {dayReservations.sort((a, b) => normalizeTime(a.startTime).localeCompare(normalizeTime(b.startTime))).map(res => (
            <div key={res.id} className="text-[10px] leading-tight bg-indigo-600 text-white p-1 rounded-md truncate font-bold shadow-sm">
              <span className="opacity-80 mr-1">{normalizeTime(res.startTime)}</span>{res.bandName}
            </div>
          ))}
        </div>
      </div>
    );
  });
}

function ReservationModal({ date, isAdmin, reservations, actualSlots, slotData, onClose, onSuccess, onDelete, onRefresh, normalizeDate, normalizeTime }: any) {
  const [bandName, setBandName] = useState('');
  const [memberCount, setMemberCount] = useState(2);
  const [selectedTime, setSelectedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [extraTime, setExtraTime] = useState('16:00');
  const dateStr = normalizeDate(date);

  const handleAdminAddSlot = async () => {
    if (!extraTime) return;
    try { await apiService.addExtraSlot(dateStr, normalizeTime(extraTime)); setIsAddingExtra(false); onRefresh(); } catch (error) { alert('追加に失敗しました。'); }
  };

  const handleAdminRemoveSlot = async (time: string) => {
    try {
      const isExtra = (slotData?.extra || []).some(s => normalizeDate(s.date) === dateStr && normalizeTime(s.startTime) === normalizeTime(time));
      if (isExtra) { await apiService.deleteExtraSlot(dateStr, normalizeTime(time)); }
      else { await apiService.addBlockedSlot(dateStr, normalizeTime(time)); }
      onRefresh();
    } catch (error) { alert('削除に失敗しました。'); }
  };

  const handleAdminRestoreSlot = async (time: string) => {
    try { await apiService.deleteBlockedSlot(dateStr, normalizeTime(time)); onRefresh(); } catch (error) { alert('復元に失敗しました。'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime || !bandName) return;
    setIsSubmitting(true);
    try { 
      await apiService.addReservation({ date: dateStr, startTime: normalizeTime(selectedTime), bandName, memberCount }); 
      onSuccess(); 
    } catch (error: any) { 
      alert(error.message || '予約に失敗しました。'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const blockedTimes = (slotData?.blocked || []).filter(s => normalizeDate(s.date) === dateStr).map(s => normalizeTime(s.startTime));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 md:p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8 sticky top-0 bg-white z-10 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-2xl font-bold tracking-tight mb-1">{format(date, 'M月d日 (E)', { locale: ja })}</h3>
              <p className="text-slate-400 text-sm font-medium">講堂予約状況</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
          </div>
          
          <div className="space-y-8">
            {isAdmin && (
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3">管理者：枠の調整</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {actualSlots.map(time => (
                    <div key={time} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-bold shadow-sm">
                      {time}
                      <button onClick={() => handleAdminRemoveSlot(time)} className="text-rose-500 hover:bg-rose-50 rounded p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  {blockedTimes.map(time => (
                    <div key={time} className="flex items-center gap-1.5 bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-500 line-through">
                      {time}
                      <button onClick={() => handleAdminRestoreSlot(time)} className="text-emerald-600 hover:bg-emerald-50 rounded p-0.5"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                {isAddingExtra ? (
                  <div className="flex gap-2 bg-white p-2 rounded-xl border border-amber-300 shadow-md">
                    <input type="time" value={extraTime} onChange={(e) => setExtraTime(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none" autoFocus />
                    <button onClick={handleAdminAddSlot} className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg shadow-sm">追加</button>
                    <button onClick={() => setIsAddingExtra(false)} className="px-3 py-2 bg-slate-100 text-slate-500 text-sm font-bold rounded-lg">×</button>
                  </div>
                ) : (
                  <button onClick={() => setIsAddingExtra(true)} className="w-full py-2.5 bg-white border-2 border-dashed border-amber-300 rounded-xl text-amber-700 text-sm font-bold hover:bg-amber-100 transition-all flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> 臨時枠を追加</button>
                )}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">タイムライン</h4>
              <div className="space-y-3">
                {actualSlots.map(time => {
                  const res = reservations.find(r => normalizeTime(r.startTime) === normalizeTime(time));
                  if (res) {
                    return (
                      <div key={time} className="flex items-center justify-between bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-2.5 rounded-xl shadow-sm"><Clock className="w-5 h-5 text-indigo-600" /></div>
                          <div>
                            <p className="font-bold text-slate-800 text-lg">{time}</p>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-bold text-indigo-700 flex items-center gap-1"><Music className="w-3.5 h-3.5" />{res.bandName}</span>
                              <span className="text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{res.memberCount}人</span>
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <button onClick={() => onDelete(res.id)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div key={time} className="flex items-center justify-between bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 border-dashed">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-2.5 rounded-xl shadow-sm"><Clock className="w-5 h-5 text-emerald-500" /></div>
                          <div>
                            <p className="font-bold text-slate-700 text-lg">{time}</p>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">Available / 空き</p>
                          </div>
                        </div>
                        <button onClick={() => setSelectedTime(time)} className="px-4 py-2 bg-white text-indigo-600 text-sm font-bold rounded-xl border border-indigo-200 shadow-sm hover:bg-indigo-50 transition-all">予約</button>
                      </div>
                    );
                  }
                })}
              </div>
            </div>

            {!isAdmin && actualSlots.length > 0 && (
              <form onSubmit={handleSubmit} className="space-y-6 pt-8 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">新規予約フォーム</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">時間枠</label>
                    <select required value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all">
                      <option value="">選択...</option>
                      {actualSlots.map(time => {
                        const isBooked = reservations.some(r => normalizeTime(r.startTime) === normalizeTime(time));
                        return <option key={time} value={time} disabled={isBooked}>{time} {isBooked ? '(予約済)' : ''}</option>;
                      })}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">人数</label>
                    <select required value={memberCount} onChange={(e) => setMemberCount(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all">
                      {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}人</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">バンド名</label>
                  <input type="text" placeholder="バンド名を入力" required value={bandName} onChange={(e) => setBandName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#4F46E5] text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}予約を確定する
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
