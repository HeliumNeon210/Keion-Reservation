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
  const [deletingAvailableId, setDeletingAvailableId] = useState<number | string | null>(null);
  const [isAddingAvailable, setIsAddingAvailable] = useState(false);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const str = String(timeStr).trim();
    
    // Handle GAS ISO format: 1899-12-30T07:00:00.000Z
    if (str.includes('T') && str.includes('Z')) {
      try {
        const date = new Date(str);
        // Use local hours because GAS "Time" objects are often relative to the spreadsheet's TZ
        // but represented as UTC in ISO strings.
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      } catch (e) {}
    }
    
    // Handle HH:mm:ss or HH:mm
    const parts = str.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    
    return str;
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return '';
    if (dateVal instanceof Date) {
      return format(dateVal, 'yyyy-MM-dd');
    }
    // Handle YYYY/MM/DD -> YYYY-MM-DD
    return String(dateVal).replace(/\//g, '-').split('T')[0];
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
      
      // Clean up time and date strings from GAS
      const cleanedReservations = resData.map(r => ({
        ...r,
        date: formatDate(r.date),
        startTime: formatTime(r.startTime)
      }));
      
      const cleanedSlots = {
        recurring: slotsData.recurring.map(s => ({ ...s, startTime: formatTime(s.startTime) })),
        extra: slotsData.extra.map(s => ({ ...s, date: formatDate(s.date), startTime: formatTime(s.startTime) })),
        blocked: slotsData.blocked.map(s => ({ ...s, date: formatDate(s.date), startTime: formatTime(s.startTime) }))
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
      setIsAddingAvailable(true);
      await apiService.addAvailableSlot({ dayOfWeek, startTime });
      fetchData();
    } catch (error) {
      alert('追加に失敗しました。');
    } finally {
      setIsAddingAvailable(false);
    }
  };

  const handleDeleteAvailableSlot = async (id: number | string) => {
    try {
      setDeletingAvailableId(id);
      await apiService.deleteAvailableSlot(id);
      fetchData();
    } catch (error) {
      alert('削除に失敗しました。');
    } finally {
      setDeletingAvailableId(null);
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
                          disabled={deletingAvailableId === slot.id}
                          className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                          {deletingAvailableId === slot.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
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
                              if (newSlotTime && !isAddingAvailable) {
                                handleAddAvailableSlot(day, newSlotTime);
                                setAddingSlotDay(null);
                                setNewSlotTime('');
                              }
                            }}
                            disabled={isAddingAvailable}
                            className="flex-1 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:hover:bg-amber-500"
                          >
                            {isAddingAvailable ? (
                              <RefreshCw className
