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
  parseISO,
  getDay
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
  X,
  Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Reservation, AvailableSlot, SlotResponse } from './types';

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

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    // Handle GAS ISO format: 1899-12-30T07:00:00.000Z
    if (timeStr.includes('T') && timeStr.includes('Z')) {
      try {
        const date = new Date(timeStr);
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      } catch (e) {
        return timeStr;
      }
    }
    return timeStr;
  };

  // Admin secret entry logic
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
      
      // Clean up time strings from GAS
      const cleanedReservations = resData.map(r => ({
        ...r,
        startTime: formatTime(r.startTime)
      }));
      
      const cleanedSlots = {
        recurring: slotsData.recurring.map(s => ({ ...s, startTime: formatTime(s.startTime) })),
        extra: slotsData.extra.map(s => ({ ...s, startTime: formatTime(s.startTime) })),
        blocked: slotsData.blocked.map(s => ({ ...s, startTime: formatTime(s.startTime) }))
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
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Start with recurring slots for this day of week
    let slots = slotData.recurring
      .filter(s => s.dayOfWeek === dayOfWeek)
      .map(s => s.startTime);
      
    // Remove blocked slots
    const blockedTimes = slotData.blocked
      .filter(s => s.date === dateStr)
      .map(s => s.startTime);
    slots = slots.filter(time => !blockedTimes.includes(time));
    
    // Add extra slots
    const extraTimes = slotData.extra
      .filter(s => s.date === dateStr)
      .map(s => s.startTime);
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
    console.log('Deleting reservation:', id);
    // Remove confirm for now to see if it's the issue in iframe
    try {
      await apiService.deleteReservation(id);
      console.log('Reservation deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete reservation:', error);
      alert('削除に失敗しました。');
    }
  };

  const handleAddAvailableSlot = async (dayOfWeek: number, startTime: string) => {
    try {
      await apiService.addAvailableSlot({ dayOfWeek, startTime });
      fetchData();
    } catch (error) {
      alert('追加に失敗しました。');
    }
  };

  const handleDeleteAvailableSlot = async (id: number | string) => {
    try {
      await apiService.deleteAvailableSlot(id);
      fetchData();
    } catch (error) {
      alert('削除に失敗しました。');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-[#4F46E5] text-white p-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setLogoTapCount(prev => prev + 1)}
          >
            <div className="bg-white/20 p-2 rounded-xl">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">軽音班予約</h1>
              <div className="flex items-center gap-1.5 text-xs opacity-80">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse flex-none aspect-square" />
                ONLINE
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchData}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
            </button>
            {isAdmin && (
              <button 
                onClick={() => setIsAdmin(false)}
                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-sm font-bold transition-all shadow-sm flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                EXIT
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Calendar Navigation */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-6 flex items-center justify-between">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold tracking-tight">
            {format(currentDate, 'yyyy年 M月', { locale: ja })}
          </h2>
          <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100">
            {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
              <div key={day} className={cn(
                "py-4 text-center text-sm font-bold text-slate-400 uppercase tracking-widest",
                i === 0 && "text-rose-400",
                i === 6 && "text-sky-400"
              )}>
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7">
            {renderCalendarDays(currentDate, reservations, slotData, calculateActualSlots, handleDayClick)}
          </div>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-white rounded-3xl shadow-sm border border-amber-200 p-6"
          >
            <div className="flex items-center gap-2 mb-6 text-amber-600">
              <Settings className="w-6 h-6" />
              <h3 className="text-xl font-bold">週間スケジュールの管理</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {[0, 1, 2, 3, 4, 5, 6].map(day => (
                <div key={day} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
                  <h4 className="font-bold mb-3 text-slate-600 text-center">
                    {['日', '月', '火', '水', '木', '金', '土'][day]}曜日
                  </h4>
                  <div className="space-y-2 flex-grow">
                    {slotData.recurring.filter(s => s.dayOfWeek === day).sort((a,b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                      <div key={slot.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm border border-slate-100">
                        <span className="text-sm font-bold text-indigo-600">{slot.startTime}</span>
                        <button 
                          onClick={() => handleDeleteAvailableSlot(slot.id)}
                          className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3">
                    {addingSlotDay === day ? (
                      <div className="flex flex-col gap-2 p-2 bg-white rounded-xl border border-amber-200 shadow-sm">
                        <input 
                          type="time" 
                          value={newSlotTime}
                          onChange={(e) => setNewSlotTime(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <button 
                            onClick={() => {
                              if (newSlotTime) {
                                handleAddAvailableSlot(day, newSlotTime);
                                setAddingSlotDay(null);
                                setNewSlotTime('');
                              }
                            }}
                            className="flex-1 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors"
                          >
                            追加
                          </button>
                          <button 
                            onClick={() => {
                              setAddingSlotDay(null);
                              setNewSlotTime('');
                            }}
                            className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setAddingSlotDay(day);
                          setNewSlotTime('16:00');
                        }}
                        className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-amber-400 hover:text-amber-500 transition-all flex items-center justify-center gap-1 text-sm font-bold"
                      >
                        <Plus className="w-4 h-4" /> 追加
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400 text-center">※ここでの変更は毎週のデフォルト設定として反映されます。</p>
          </motion.div>
        )}
      </main>

      {/* Reservation Modal */}
      <AnimatePresence>
        {isModalOpen && selectedDate && (
          <ReservationModal 
            date={selectedDate}
            isAdmin={isAdmin}
            reservations={reservations.filter(r => r.date === format(selectedDate, 'yyyy-MM-dd'))}
            actualSlots={calculateActualSlots(selectedDate)}
            slotData={slotData}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
              setIsModalOpen(false);
              fetchData();
            }}
            onDelete={handleDeleteReservation}
            onRefresh={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function renderCalendarDays(
  currentDate: Date, 
  reservations: Reservation[], 
  slotData: SlotResponse,
  calculateActualSlots: (date: Date) => string[],
  onDayClick: (day: Date) => void
) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = [];
  let day = startDate;
  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  return calendarDays.map((day) => {
    const formattedDate = format(day, 'yyyy-MM-dd');
    const dayReservations = reservations.filter(r => r.date === formattedDate);
    const actualSlots = calculateActualSlots(day);
    const isCurrentMonth = isSameMonth(day, monthStart);
    const isToday = isSameDay(day, new Date());

    return (
      <div 
        key={day.toString()}
        onClick={() => onDayClick(day)}
        className={cn(
          "min-h-[120px] p-2 border-r border-b border-slate-50 relative cursor-pointer transition-all hover:bg-slate-50 group",
          !isCurrentMonth && "bg-slate-50/50 opacity-30"
        )}
      >
        <div className="flex justify-between items-start mb-1">
          <span className={cn(
            "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-none aspect-square",
            isToday ? "bg-[#4F46E5] text-white" : "text-slate-400 group-hover:text-slate-600"
          )}>
            {format(day, 'd')}
          </span>
          {actualSlots.length > 0 && dayReservations.length < actualSlots.length && (
            <div className={cn(
              "w-1.5 h-1.5 rounded-full flex-none aspect-square",
              slotData.extra.some(s => s.date === formattedDate)
                ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
            )} />
          )}
        </div>
        
        <div className="space-y-1">
          {dayReservations.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(res => (
            <div 
              key={res.id} 
              className="text-[10px] leading-tight bg-indigo-50 text-indigo-700 p-1.5 rounded-lg border border-indigo-100 truncate font-medium shadow-sm"
            >
              <span className="opacity-60 mr-1">{res.startTime}</span>
              {res.bandName}
            </div>
          ))}
        </div>
      </div>
    );
  });
}

function ReservationModal({ 
  date, 
  isAdmin,
  reservations, 
  actualSlots, 
  slotData,
  onClose, 
  onSuccess,
  onDelete,
  onRefresh
}: { 
  date: Date; 
  isAdmin: boolean;
  reservations: Reservation[]; 
  actualSlots: string[];
  slotData: SlotResponse;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: (id: number | string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [bandName, setBandName] = useState('');
  const [memberCount, setMemberCount] = useState(2);
  const [selectedTime, setSelectedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [extraTime, setExtraTime] = useState('18:00');

  const dateStr = format(date, 'yyyy-MM-dd');

  const handleAdminAddSlot = async () => {
    if (!extraTime) return;
    try {
      await apiService.addExtraSlot(dateStr, extraTime);
      setIsAddingExtra(false);
      onRefresh();
    } catch (error) {
      alert('追加に失敗しました。');
    }
  };

  const handleAdminRemoveSlot = async (time: string) => {
    try {
      // Check if it was an extra slot
      const isExtra = slotData.extra.some(s => s.date === dateStr && s.startTime === time);
      if (isExtra) {
        await apiService.deleteExtraSlot(dateStr, time);
      } else {
        // It's a recurring slot, so block it
        await apiService.addBlockedSlot(dateStr, time);
      }
      onRefresh();
    } catch (error) {
      alert('削除に失敗しました。');
    }
  };

  const handleAdminRestoreSlot = async (time: string) => {
    try {
      await apiService.deleteBlockedSlot(dateStr, time);
      onRefresh();
    } catch (error) {
      alert('復元に失敗しました。');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime || !bandName) return;

    setIsSubmitting(true);
    try {
      await apiService.addReservation({
        date: dateStr,
        startTime: selectedTime,
        bandName,
        memberCount
      });
      onSuccess();
    } catch (error: any) {
      alert(error.message || '予約に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const blockedTimes = slotData.blocked.filter(s => s.date === dateStr).map(s => s.startTime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-6 md:p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8 sticky top-0 bg-white z-10 pb-2">
            <div>
              <h3 className="text-2xl font-bold tracking-tight mb-1">
                {format(date, 'M月d日 (E)', { locale: ja })}
              </h3>
              <p className="text-slate-400 text-sm font-medium">講堂の予約・管理</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="space-y-8">
            {/* Admin: Manage slots for this day */}
            {isAdmin && (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">臨時枠の管理（この日のみ）</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {actualSlots.map(time => (
                    <div key={time} className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-200 text-xs font-bold">
                      {time}
                      <button onClick={() => handleAdminRemoveSlot(time)} className="text-rose-500 hover:bg-rose-50 rounded p-0.5" title="この日だけ削除">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {blockedTimes.map(time => (
                    <div key={time} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-400 line-through">
                      {time}
                      <button onClick={() => handleAdminRestoreSlot(time)} className="text-emerald-500 hover:bg-emerald-50 rounded p-0.5" title="枠を復元">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                
                {isAddingExtra ? (
                  <div className="flex gap-2 bg-white p-2 rounded-xl border border-amber-200 shadow-sm">
                    <input 
                      type="time" 
                      value={extraTime}
                      onChange={(e) => setExtraTime(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      autoFocus
                    />
                    <button 
                      onClick={handleAdminAddSlot}
                      className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      追加
                    </button>
                    <button 
                      onClick={() => setIsAddingExtra(false)}
                      className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsAddingExtra(true)}
                    className="w-full py-2 bg-white border border-amber-200 rounded-xl text-amber-600 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> 臨時枠を追加
                  </button>
                )}
              </div>
            )}

            {/* Slots Status */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">予約状況</h4>
              {actualSlots.length > 0 ? (
                <div className="space-y-3">
                  {actualSlots.sort().map(time => {
                    const res = reservations.find(r => r.startTime === time);
                    if (res) {
                      return (
                        <div key={res.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                          <div className="flex items-center gap-4">
                            <div className="bg-white p-2 rounded-xl shadow-sm">
                              <Clock className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-700">{res.startTime}</p>
                              <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1 font-bold text-indigo-600"><Music className="w-3 h-3" /> {res.bandName}</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {res.memberCount}人</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            disabled={deletingId === res.id}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDeletingId(res.id);
                              try {
                                await onDelete(res.id);
                              } finally {
                                setDeletingId(null);
                              }
                            }}
                            className={cn(
                              "p-2 rounded-xl transition-all flex items-center justify-center",
                              deletingId === res.id ? "text-slate-300" : "text-rose-500 hover:bg-rose-50"
                            )}
                            title="削除"
                          >
                            {deletingId === res.id ? (
                              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      );
                    } else {
                      return (
                        <div key={time} className="flex items-center justify-between bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50 border-dashed">
                          <div className="flex items-center gap-4">
                            <div className="bg-white p-2 rounded-xl shadow-sm">
                              <Clock className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-700">{time}</p>
                              <p className="text-xs font-bold text-emerald-600">空き</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedTime(time)}
                            className="text-xs font-bold text-indigo-600 hover:underline"
                          >
                            予約する
                          </button>
                        </div>
                      );
                    }
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm font-medium">この日の枠はありません</p>
                </div>
              )}
            </div>

            {/* New Reservation Form */}
            {actualSlots.length > 0 && (
              <form onSubmit={handleSubmit} className="space-y-6 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">新規予約</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 block px-1">時間枠</label>
                    <select 
                      required
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value="">選択してください</option>
                      {actualSlots.map(time => {
                        const isBooked = reservations.some(r => r.startTime === time);
                        return (
                          <option key={time} value={time} disabled={isBooked}>
                            {time} {isBooked ? '(予約済み)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 block px-1">人数</label>
                    <select 
                      required
                      value={memberCount}
                      onChange={(e) => setMemberCount(parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    >
                      {[2,3,4,5,6,7,8,9,10].map(n => (
                        <option key={n} value={n}>{n}人</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600 block px-1">バンド名</label>
                  <input 
                    type="text"
                    placeholder="バンド名を入力"
                    required
                    value={bandName}
                    onChange={(e) => setBandName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#4F46E5] text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  予約を確定する
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
