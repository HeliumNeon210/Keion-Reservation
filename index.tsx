import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    MusicalNoteIcon, Cog6ToothIcon, PlusIcon, TrashIcon, 
    ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon, CheckIcon, XMarkIcon,
    UserGroupIcon, ChevronDownIcon
} from '@heroicons/react/24/outline';
import { 
    format, endOfMonth, eachDayOfInterval, isSameDay, isPast, getDay, addMonths, subMonths, startOfMonth
} from 'date-fns';
import { ja } from 'date-fns/locale';

// --- 設定・定数 ---
const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxE2yxvOsFM-ReaI2kYCQj4UrVWqj0VdKly61x_l9fnPCwpkxTetmUTtjpEopHvu5GA/exec";

const DEFAULT_RULES = [
    { dayOfWeek: 1, slots: ["16:00-17:00", "17:00-18:00"] }, // 月
    { dayOfWeek: 2, slots: ["16:00-17:00", "17:00-18:00"] }, // 火
    { dayOfWeek: 4, slots: ["16:00-17:00", "17:00-18:00"] }, // 木
    { dayOfWeek: 5, slots: ["17:00-18:00"] },               // 金
];
const DAYS_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"];

// --- アプリケーション本体 ---
const App = () => {
    // 状態管理
    const [role, setRole] = useState('STUDENT'); 
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [bookings, setBookings] = useState([]);
    const [rules, setRules] = useState(DEFAULT_RULES);
    const [specialSchedules, setSpecialSchedules] = useState([]);

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
    
    const [newSpecialInput, setNewSpecialInput] = useState("");
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [weeklyAddingDayIdx, setWeeklyAddingDayIdx] = useState(null);
    const [weeklySlotInput, setWeeklySlotInput] = useState("");

    // 隠しコマンド（2秒以内に3回連打）用
    const [tapCount, setTapCount] = useState(0);
    const [lastTapTime, setLastTapTime] = useState(0);

    // --- データ通信 ---
    const fetchCloudData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(GAS_WEBAPP_URL);
            const data = await response.json();
            if (data.bookings) setBookings(data.bookings);
            if (data.rules) setRules(data.rules);
            if (data.specialSchedules) setSpecialSchedules(data.specialSchedules);
        } catch (e) { console.error("Fetch error:", e); }
        finally { setIsLoading(false); }
    };

    const saveToCloud = async (nb, nr, ns) => {
        setIsSyncing(true);
        try {
            await fetch(GAS_WEBAPP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ bookings: nb, rules: nr, specialSchedules: ns }),
            });
        } catch (e) { console.error("Save error:", e); }
        finally { setTimeout(() => setIsSyncing(false), 800); }
    };

    useEffect(() => { fetchCloudData(); }, []);

    const updateAndSync = (nb, nr, ns) => {
        setBookings([...nb]); 
        setRules([...nr]); 
        setSpecialSchedules([...ns]);
        saveToCloud(nb, nr, ns);
    };

    // --- 各種ロジック ---
    const handleSecretTap = () => {
        if (role === 'ADVISOR') return;
        const now = Date.now();
        if (now - lastTapTime > 2000) {
            setTapCount(1);
        } else {
            const nextCount = tapCount + 1;
            if (nextCount >= 3) {
                setRole('ADVISOR');
                setTapCount(0);
                if (window.navigator?.vibrate) window.navigator.vibrate(50);
            } else {
                setTapCount(nextCount);
            }
        }
        setLastTapTime(now);
    };

    const getSlotsForDate = (date) => {
        if (!date) return [];
        const ds = format(date, 'yyyy-MM-dd');
        const sp = specialSchedules.find(s => s.date === ds);
        if (sp) return sp.isDisabled ? [] : sp.slots;
        const rule = rules.find(r => r.dayOfWeek === getDay(date));
        return rule ? rule.slots : [];
    };

    const addSpecialSlot = () => {
        if (!newSpecialInput.trim() || !selectedDate) return;
        const ds = format(selectedDate, 'yyyy-MM-dd');
        const currentSlots = getSlotsForDate(selectedDate);
        const updatedSlots = [...currentSlots, newSpecialInput.trim()].sort();
        const nextSpecials = [...specialSchedules];
        const idx = nextSpecials.findIndex(s => s.date === ds);
        if (idx > -1) {
            nextSpecials[idx] = { ...nextSpecials[idx], slots: updatedSlots, isDisabled: false };
        } else {
            nextSpecials.push({ date: ds, slots: updatedSlots, isDisabled: false });
        }
        updateAndSync(bookings, rules, nextSpecials);
        setNewSpecialInput("");
        setIsAddingMode(false);
    };

    const addWeeklySlot = (dayIdx) => {
        if (!weeklySlotInput.trim()) return;
        let nextRules = [...rules];
        const ridx = nextRules.findIndex(r => r.dayOfWeek === dayIdx);
        if (ridx > -1) {
            nextRules[ridx] = { ...nextRules[ridx], slots: [...nextRules[ridx].slots, weeklySlotInput.trim()].sort() };
        } else {
            nextRules.push({ dayOfWeek: dayIdx, slots: [weeklySlotInput.trim()] });
        }
        updateAndSync(bookings, nextRules, specialSchedules);
        setWeeklySlotInput("");
        setWeeklyAddingDayIdx(null);
    };

    const days = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing with Cloud...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* ヘッダー */}
            <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-xl px-4 py-3">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div 
                            className="relative cursor-pointer touch-none select-none active:scale-90 transition-transform duration-75"
                            onClick={handleSecretTap}
                        >
                            <div className={`p-2 rounded-xl transition-colors duration-500 ${role === 'ADVISOR' ? 'bg-amber-400 text-slate-900' : 'bg-indigo-600'}`}>
                                <MusicalNoteIcon className="w-6 h-6" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xs md:text-xl font-black uppercase tracking-tight text-white">軽音班 講堂予約</h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                                <span className="text-[9px] font-bold opacity-50 uppercase tracking-widest text-white">
                                    {role === 'ADVISOR' ? 'ADMIN MODE' : isSyncing ? 'SYNCING...' : 'ONLINE'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        {role === 'ADVISOR' && (
                            <>
                                <button onClick={() => setRole('STUDENT')} className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-[9px] font-black uppercase text-white">Exit</button>
                                <button onClick={() => setIsSettingsModalOpen(true)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                    <Cog6ToothIcon className="w-6 h-6 text-amber-400" />
                                </button>
                            </>
                        )}
                        <button onClick={fetchCloudData} className="p-1 hover:bg-white/10 rounded-full text-white"><ArrowPathIcon className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} /></button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
                <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
                    <h2 className="text-lg font-black text-slate-800">{format(currentMonth, 'yyyy年 MMMM', { locale: ja })}</h2>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRightIcon className="w-5 h-5" /></button>
                </div>

                <div className="calendar-grid">
                    {DAYS_OF_WEEK.map(d => (
                        <div key={d} className={`pb-2 text-center text-[9px] font-black uppercase tracking-widest ${d === '日' ? 'text-red-400' : d === '土' ? 'text-indigo-400' : 'text-slate-400'}`}>{d}</div>
                    ))}
                    {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
                        <div key={i} className="bg-slate-100/50 rounded-2xl h-16 md:h-36" />
                    ))}
                    {days.map(date => {
                        const ds = format(date, 'yyyy-MM-dd');
                        const activeSlots = getSlotsForDate(date);
                        const dateBookings = bookings.filter(b => b.date === ds);
                        const isToday = isSameDay(date, new Date());
                        const past = isPast(date) && !isToday;
                        const isModified = specialSchedules.some(s => s.date === ds);
                        const hasAvailability = activeSlots.length > 0 && dateBookings.length < activeSlots.length;

                        return (
                            <div 
                                key={ds} 
                                onClick={() => !past && (setSelectedDate(date), setIsBookingModalOpen(true), setIsAddingMode(false))} 
                                className={`bg-white min-h-[5.5rem] md:min-h-[10rem] p-2 rounded-2xl border transition-all active:scale-95 cursor-pointer flex flex-col ${past ? 'opacity-30' : 'hover:border-indigo-400 shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400'}`}>{format(date, 'd')}</span>
                                    <div className="flex gap-1">
                                        {isModified && !past && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>}
                                        {hasAvailability && !past && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_4px_rgba(52,211,153,0.5)]"></div>}
                                    </div>
                                </div>
                                <div className="flex-1 space-y-0.5 overflow-hidden">
                                    {dateBookings.map(b => (
                                        <div key={b.id} className="text-[8px] md:text-[9px] px-1 bg-indigo-50 text-indigo-700 rounded-md truncate font-bold border border-indigo-100">
                                            {b.bandName} {b.memberCount ? `(${b.memberCount}人)` : ''}
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center animate-fade-in" onClick={() => setIsBookingModalOpen(false)}>
                    <div className="bg-white rounded-t-3xl md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 p-6 text-white shrink-0 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-white">{format(selectedDate, 'M月 d日 (E)', { locale: ja })}</h3>
                                <p className="text-[10px] font-bold uppercase opacity-40 tracking-[0.2em] text-white">{role === 'ADVISOR' ? 'ADMIN CONSOLE' : 'RESERVATION'}</p>
                            </div>
                            <button onClick={() => setIsBookingModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">✕</button>
                        </div>

                        <div className="p-4 space-y-4 overflow-y-auto flex-1 bg-white">
                            {role === 'ADVISOR' && (
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                                    <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-3 text-center">臨時スケジュール管理</p>
                                    <div className="flex flex-col gap-2">
                                        {!isAddingMode ? (
                                            <button onClick={() => setIsAddingMode(true)} className="w-full bg-white border border-amber-300 text-amber-700 py-2.5 rounded-xl text-xs font-black shadow-sm">+ 枠を追加</button>
                                        ) : (
                                            <div className="flex gap-1 animate-fade-in">
                                                <input 
                                                    autoFocus
                                                    type="text" placeholder="16:00-17:00" 
                                                    value={newSpecialInput} onChange={e => setNewSpecialInput(e.target.value)}
                                                    className="flex-1 px-3 py-2 border-2 border-amber-300 rounded-xl text-xs font-bold outline-none shadow-sm"
                                                />
                                                <button onClick={addSpecialSlot} className="bg-amber-400 p-2.5 rounded-xl text-slate-900 shadow-md"><CheckIcon className="w-5 h-5" /></button>
                                                <button onClick={() => {setIsAddingMode(false); setNewSpecialInput("");}} className="bg-white border border-slate-300 p-2.5 rounded-xl text-slate-400"><XMarkIcon className="w-5 h-5" /></button>
                                            </div>
                                        )}
                                        {specialSchedules.some(s => s.date === format(selectedDate, 'yyyy-MM-dd')) && (
                                            <button onClick={() => {
                                                const ds = format(selectedDate, 'yyyy-MM-dd');
                                                updateAndSync(bookings, rules, specialSchedules.filter(s => s.date !== ds));
                                            }} className="w-full bg-slate-200 text-slate-500 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">通常に戻す</button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {getSlotsForDate(selectedDate).length === 0 ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50 rounded-3xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">No Available Slots</p>
                                    </div>
                                ) : (
                                    getSlotsForDate(selectedDate).map(slot => {
                                        const ds = format(selectedDate, 'yyyy-MM-dd');
                                        const b = bookings.find(x => x.date === ds && x.timeSlot === slot);
                                        return (
                                            <div key={slot} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 flex items-center justify-between shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xs text-slate-800">{slot}</span>
                                                    {role === 'ADVISOR' && (
                                                        <button onClick={() => {
                                                            const currentSlots = getSlotsForDate(selectedDate);
                                                            const updatedSlots = currentSlots.filter(s => s !== slot);
                                                            const nextSpecials = [...specialSchedules];
                                                            const idx = nextSpecials.findIndex(s => s.date === ds);
                                                            if (idx > -1) nextSpecials[idx] = { ...nextSpecials[idx], slots: updatedSlots, isDisabled: updatedSlots.length === 0 };
                                                            else nextSpecials.push({ date: ds, slots: updatedSlots, isDisabled: updatedSlots.length === 0 });
                                                            updateAndSync(bookings, rules, nextSpecials);
                                                        }} className="text-[9px] text-red-400 font-bold mt-1 text-left">消去</button>
                                                    )}
                                                </div>
                                                {b ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col items-end">
                                                            <span className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg">
                                                                {b.bandName}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                                                                <UserGroupIcon className="w-3 h-3" /> {b.memberCount}人
                                                            </span>
                                                        </div>
                                                        <button onClick={() => setConfirmingDeleteId(b.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-xl transition-all">
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 items-center">
                                                        <div className="flex flex-col gap-1.5">
                                                            <input id={`bn-${slot}`} placeholder="バンド名" className="w-32 px-2 py-2 border rounded-xl text-xs font-bold outline-none shadow-inner" />
                                                            <div className="relative group">
                                                                <select id={`bc-${slot}`} className="w-full pl-8 pr-2 py-2 border rounded-xl text-[10px] font-black outline-none shadow-inner bg-white appearance-none cursor-pointer">
                                                                    {Array.from({ length: 9 }, (_, i) => i + 2).map(num => (
                                                                        <option key={num} value={num}>{num}人</option>
                                                                    ))}
                                                                </select>
                                                                <UserGroupIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                                <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                                            </div>
                                                        </div>
                                                        <button onClick={() => {
                                                            const band = (document.getElementById(`bn-${slot}`) as HTMLInputElement).value;
                                                            const count = (document.getElementById(`bc-${slot}`) as HTMLSelectElement).value;
                                                            if(!band.trim()) return;
                                                            const nb = [...bookings, { 
                                                                id:`id-${Date.now()}`, 
                                                                date:ds, 
                                                                timeSlot:slot, 
                                                                bandName:band,
                                                                memberCount:count || "2"
                                                            }];
                                                            updateAndSync(nb, rules, specialSchedules);
                                                        }} className="bg-indigo-600 text-white p-3.5 rounded-2xl active:scale-90 shadow-md h-fit transition-transform shadow-indigo-100"><PlusIcon className="w-5 h-5" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {confirmingDeleteId && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in text-center shadow-inner mt-4">
                                    <p className="text-[9px] font-black text-red-600 uppercase mb-3">予約を削除しますか？</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            updateAndSync(bookings.filter(x => x.id !== confirmingDeleteId), rules, specialSchedules);
                                            setConfirmingDeleteId(null);
                                        }} className="flex-1 bg-red-600 text-white py-2 rounded-xl text-xs font-black shadow-lg">削除実行</button>
                                        <button onClick={() => setConfirmingDeleteId(null)} className="flex-1 bg-white border border-slate-200 py-2 rounded-xl text-xs font-black">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50 border-t flex justify-center shadow-inner">
                            <button onClick={() => setIsBookingModalOpen(false)} className="w-full bg-white border-2 border-slate-200 py-3 rounded-2xl font-black text-xs text-slate-500 shadow-sm uppercase tracking-widest active:scale-95 transition-all">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 週間設定モーダル */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsSettingsModalOpen(false)}>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white/20" onClick={e => e.stopPropagation()}>
                        <div className="bg-amber-500 p-8 text-white shrink-0 relative overflow-hidden">
                            <h3 className="text-xl font-black uppercase tracking-tight text-white">Weekly Settings</h3>
                            <p className="text-amber-100 text-[10px] font-bold uppercase tracking-widest opacity-70 text-white">週間デフォルト設定</p>
                        </div>
                        <div className="p-4 md:p-8 overflow-y-auto flex-1 space-y-3 bg-slate-50 shadow-inner">
                            {DAYS_OF_WEEK.map((day, idx) => {
                                const r = rules.find(x => x.dayOfWeek === idx);
                                return (
                                    <div key={day} className="p-4 bg-white rounded-2xl border border-slate-100 flex flex-col gap-3 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className={`font-black text-base ${day === '日' ? 'text-red-400' : day === '土' ? 'text-indigo-400' : 'text-slate-500'}`}>{day}曜</span>
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                {r?.slots.map(s => (
                                                    <span key={s} className="bg-slate-50 px-2.5 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 border border-slate-100 shadow-sm">
                                                        {s} 
                                                        <button onClick={() => {
                                                            const nr = rules.map(rule => rule.dayOfWeek === idx ? { ...rule, slots: rule.slots.filter(sl => sl !== s) } : rule);
                                                            updateAndSync(bookings, nr, specialSchedules);
                                                        }} className="text-slate-300 hover:text-red-500 transition-colors">✕</button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {weeklyAddingDayIdx === idx ? (
                                            <div className="flex gap-1 animate-fade-in border-t pt-2 mt-1">
                                                <input 
                                                    autoFocus
                                                    type="text" placeholder="16:00-17:00" 
                                                    value={weeklySlotInput} onChange={e => setWeeklySlotInput(e.target.value)}
                                                    className="flex-1 px-3 py-2 border-2 border-amber-300 rounded-xl text-xs font-bold outline-none bg-slate-50 focus:bg-white transition-all"
                                                />
                                                <button onClick={() => addWeeklySlot(idx)} className="bg-amber-400 p-2 rounded-xl text-slate-900 shadow-md"><CheckIcon className="w-5 h-5" /></button>
                                                <button onClick={() => {setWeeklyAddingDayIdx(null); setWeeklySlotInput("");}} className="bg-white border border-slate-300 p-2 rounded-xl text-slate-400"><XMarkIcon className="w-5 h-5" /></button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => { setWeeklyAddingDayIdx(idx); setWeeklySlotInput(""); }}
                                                className="w-full border-2 border-dashed border-slate-200 text-slate-400 py-2 rounded-xl text-[10px] font-black hover:border-amber-300 hover:text-amber-500 transition-all active:scale-95"
                                            >
                                                + 枠を追加
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-6 bg-white border-t flex justify-end shadow-inner">
                            <button onClick={() => setIsSettingsModalOpen(false)} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">完了</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
