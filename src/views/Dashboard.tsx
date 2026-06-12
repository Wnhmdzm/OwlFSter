/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { FMSCase, Resolution, CallResponse } from '../types';
import { formatCurrency } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { 
  Users, 
  DollarSign, 
  FileCheck, 
  RefreshCcw, 
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  PhoneCall,
  Activity,
  Award,
  Search,
  Download,
  HelpCircle,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

const RESOLUTION_COLORS = {
  confirmedFraud: '#ef4444',     // Red-500
  suspectedFraud: '#f59e0b',     // Amber-500
  confirmedGenuine: '#10b981',   // Emerald-500
  assumedGenuine: '#6366f1'      // Indigo-500
};

export default function Dashboard() {
  const [cases, setCases] = useState<FMSCase[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Set default initial date to 2026-06-11 (pre-populated cases date), updated dynamically on load to latest.
  const [selectedDate, setSelectedDate] = useState('22026-06-11');
  const [resolutionSearch, setResolutionSearch] = useState('');

  const [filters, setFilters] = useState({
    assignedTo: 'All',
    eventType: 'All'
  });

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/cases');
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically set default date to latest available case date on load
  useEffect(() => {
    if (cases.length > 0) {
      const dates = cases.map(c => {
        const caseTime = c.caseCreatedTime || c.caseAssignedTime;
        if (caseTime && caseTime.trim().length >= 10) {
          if (caseTime.includes('/')) {
            const datePart = caseTime.split(',')[0].trim();
            const [d, m, y] = datePart.split('/');
            return `${y}-${m}-${d}`;
          }
          return caseTime.trim().substring(0, 10);
        }
        return '';
      }).filter(Boolean);
      
      if (dates.length > 0) {
        const sorted = dates.sort((a, b) => b.localeCompare(a));
        setSelectedDate(sorted[0]);
      } else {
        setSelectedDate(new Date().toISOString().substring(0, 10));
      }
    } else {
      setSelectedDate(new Date().toISOString().substring(0, 10));
    }
  }, [cases]);

  // Robust date matcher matching both "DD/MM/YYYY" and "YYYY-MM-DD"
  const isSameDay = (caseTime: string | undefined, targetDateStr: string) => {
    if (!caseTime) return false;
    const [ty, tm, td] = targetDateStr.split('-');
    
    if (caseTime.includes('/')) {
      const datePart = caseTime.split(',')[0].trim();
      const [d, m, y] = datePart.split('/');
      return d === td && m === tm && y === ty;
    }
    
    return caseTime.startsWith(targetDateStr);
  };

  // ------------------------------------------------------------
  // ALL-TIME Day-by-Day Historical Line Graph Computations
  // ------------------------------------------------------------
  const historyTrendData = useMemo(() => {
    const dayCounts: Record<string, number> = {};
    
    cases.forEach(c => {
      const caseTime = c.caseCreatedTime || c.caseAssignedTime;
      if (caseTime && caseTime.trim().length >= 10) {
        let cleanDate = '';
        if (caseTime.includes('/')) {
          const datePart = caseTime.split(',')[0].trim();
          const [d, m, y] = datePart.split('/');
          cleanDate = `${y}-${m}-${d}`;
        } else {
          cleanDate = caseTime.trim().substring(0, 10);
        }
        dayCounts[cleanDate] = (dayCounts[cleanDate] || 0) + 1;
      }
    });

    return Object.entries(dayCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [cases]);

  // Filter cases strictly belonging to selected date
  const selectedDayCases = useMemo(() => {
    return cases.filter(c => isSameDay(c.caseCreatedTime || c.caseAssignedTime, selectedDate));
  }, [cases, selectedDate]);

  // Filter with staff slicers and type slicers
  const filteredDayCases = useMemo(() => {
    return selectedDayCases.filter(c => {
      const matchAssigned = filters.assignedTo === 'All' || c.assignedTo === filters.assignedTo;
      const matchType = filters.eventType === 'All' || c.eventType === filters.eventType;
      return matchAssigned && matchType;
    });
  }, [selectedDayCases, filters]);

  // Stats Card data for selected Date
  const dayStats = useMemo(() => {
    const totalAmount = filteredDayCases.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalCif = new Set(filteredDayCases.map(c => c.userId).filter(Boolean)).size;
    
    const fraudCount = filteredDayCases.filter(c => {
      const res = c.resolution || '';
      return res.toLowerCase().includes('fraud') || res.toLowerCase().includes('suspect');
    }).length;

    return {
      totalAmount,
      totalCif,
      fraudCount,
      total: filteredDayCases.length
    };
  }, [filteredDayCases]);

  // ------------------------------------------------------------
  // Selected Day Resolution Standings (New Day, New Calculations)
  // ------------------------------------------------------------
  const dailyResolutionStandings = useMemo(() => {
    const stands: Record<string, {
      psid: string;
      confirmedFraud: number;
      suspectedFraud: number;
      confirmedGenuine: number;
      assumedGenuine: number;
      totalRib: number;
      contacted: number;
      unableToContact: number;
      closeManual: number;
    }> = {};

    selectedDayCases.forEach(c => {
      const psid = c.assignedTo || 'System / Pool';
      if (!stands[psid]) {
        stands[psid] = {
          psid,
          confirmedFraud: 0,
          suspectedFraud: 0,
          confirmedGenuine: 0,
          assumedGenuine: 0,
          totalRib: 0,
          contacted: 0,
          unableToContact: 0,
          closeManual: 0,
        };
      }

      const row = stands[psid];

      // FMS Resolutions
      const res = c.resolution || '';
      if (res.toLowerCase().includes('confirm') && res.toLowerCase().includes('fraud')) {
        row.confirmedFraud += 1;
        row.totalRib += 1;
      } else if (res.toLowerCase().includes('suspect')) {
        row.suspectedFraud += 1;
        row.totalRib += 1;
      } else if (res.toLowerCase().includes('confirmed') && res.toLowerCase().includes('genuine')) {
        row.confirmedGenuine += 1;
        row.totalRib += 1;
      } else if (res.toLowerCase().includes('assume')) {
        row.assumedGenuine += 1;
        row.totalRib += 1;
      } else {
        row.totalRib += 1;
      }

      // Call Response
      const resp = c.callResponse || '';
      if (resp.toLowerCase().includes('contacted')) {
        row.contacted += 1;
      } else if (resp.toLowerCase().includes('unable')) {
        row.unableToContact += 1;
      } else if (resp.toLowerCase().includes('close') || resp.toLowerCase().includes('screen') || resp.toLowerCase().includes('manual')) {
        row.closeManual += 1;
      }
    });

    return Object.values(stands).sort((a, b) => b.totalRib - a.totalRib);
  }, [selectedDayCases]);

  const filteredResolutionStandings = useMemo(() => {
    return dailyResolutionStandings.filter(item => 
      item.psid.toLowerCase().includes(resolutionSearch.toLowerCase())
    );
  }, [resolutionSearch, dailyResolutionStandings]);

  // Overall pie categorization for the chosen day
  const resolutionPieData = useMemo(() => {
    const counts: Record<string, number> = {
      'Confirmed Fraud': 0,
      'Suspected Fraud': 0,
      'Confirmed Genuine': 0,
      'Assumed Genuine': 0,
    };

    filteredDayCases.forEach(c => {
      const res = c.resolution || '';
      if (res.toLowerCase().includes('confirm') && res.toLowerCase().includes('fraud')) {
        counts['Confirmed Fraud'] += 1;
      } else if (res.toLowerCase().includes('suspect')) {
        counts['Suspected Fraud'] += 1;
      } else if (res.toLowerCase().includes('confirmed') && res.toLowerCase().includes('genuine')) {
        counts['Confirmed Genuine'] += 1;
      } else if (res.toLowerCase().includes('assume')) {
        counts['Assumed Genuine'] += 1;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [filteredDayCases]);

  const uniqueAssignees = useMemo(() => ['All', ...Array.from(new Set(selectedDayCases.map(c => c.assignedTo))).filter(Boolean)], [selectedDayCases]);
  const uniqueTypes = useMemo(() => ['All', ...Array.from(new Set(selectedDayCases.map(c => c.eventType))).filter(Boolean)], [selectedDayCases]);

  const downloadResolutionReport = () => {
    const dataToExport = filteredResolutionStandings.map((r, i) => ({
      'No': i + 1,
      'Officer (PSID)': r.psid,
      'Confirmed Fraud': r.confirmedFraud,
      'Suspected Fraud': r.suspectedFraud,
      'Confirmed Genuine': r.confirmedGenuine,
      'Assumed Genuine': r.assumedGenuine,
      'Total Cases': r.totalRib,
      'Call Contacted': r.contacted,
      'Unable to Contact': r.unableToContact,
      'Close Manual (Genuine)': r.closeManual
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Daily_FMS_${selectedDate}`);
    
    const max_len = [5, 20, 15, 15, 15, 15, 12, 16, 18, 20];
    worksheet['!cols'] = max_len.map(w => ({ wch: w }));

    XLSX.writeFile(workbook, `FMS_Daily_Standings_${selectedDate}.xlsx`);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12">
        <RefreshCcw className="animate-spin text-indigo-600 mb-4" size={32} />
        <p className="text-slate-500 font-bold tracking-wide animate-pulse uppercase text-[11px]">Synchronizing Cloud Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header and Date Selector for Day View Setup */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Unified Resolution Dashboard</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mt-1">
            Real-time daily workloads & chronological case ingestion logs
          </p>
        </div>
        
        {/* Dynamic Day View picker controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3.5 top-3 text-indigo-600" size={13} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-8 pr-4 py-2 bg-indigo-50/50 hover:bg-indigo-50 text-slate-900 border border-indigo-200 rounded-xl outline-none font-black text-xs tracking-wider shadow-sm transition-all cursor-pointer"
            />
          </div>
          <button 
            onClick={fetchCases}
            title="Force reload cases"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCcw size={13} />
          </button>
        </div>
      </div>

      {/* Row 2: Top Row metrics cards reacting live to selected date (New Day, New Calculations) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">Day Financial Value</span>
            <span className="text-xl font-black text-slate-800 font-mono tracking-tight">
              {formatCurrency(dayStats.totalAmount)}
            </span>
            <span className="text-[9px] text-slate-400 font-bold block">{selectedDate} volume</span>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl border border-indigo-100">
            <DollarSign size={16} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">Day Frauds Highlight</span>
            <span className="text-xl font-black text-red-650 font-mono tracking-tight">
              {dayStats.fraudCount}
            </span>
            <span className="text-[9px] text-red-600/70 font-semibold block">Confirmed & Suspected</span>
          </div>
          <div className="bg-red-50 text-red-600 p-2.5 rounded-xl border border-red-150">
            <AlertTriangle size={16} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">Day Total CIFs</span>
            <span className="text-xl font-black text-emerald-600 font-mono tracking-tight">
              {dayStats.totalCif}
            </span>
            <span className="text-[9px] text-emerald-600/70 font-semibold block">Unique account IDs</span>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-150">
            <Users size={16} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">Day Resolved Cases</span>
            <span className="text-xl font-black text-slate-800 font-mono tracking-tight">
              {dayStats.total}
            </span>
            <span className="text-[9px] text-slate-400 font-semibold block">Parsed entries</span>
          </div>
          <div className="bg-slate-50 text-slate-600 p-2.5 rounded-xl border border-slate-200">
            <FileCheck size={16} />
          </div>
        </div>
      </div>

      {/* Row 3: Grid Division split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Span (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Day-by-Day Historical Line Graph */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
                  <TrendingUp size={13} className="text-indigo-600" /> Chronological Daily Cases Load (Line Graph)
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Total cumulative raw inputs computed day by day</p>
              </div>
              <span className="text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">All-time trend</span>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: 10 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#1e1b4b" 
                    strokeWidth={2.5} 
                    dot={{ fill: '#4f46e5', strokeWidth: 1.5, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PSID Resolution standings bar chart and detailed rankings (Request 1 & Request 2 requirements) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Award size={13} className="text-indigo-600" /> PSID Team Daily Scorecard Graph (Vertically Rising)
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Resolutions and actions sum comparison per officer for {selectedDate}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 text-slate-400" size={12} />
                  <input
                    type="text"
                    placeholder="Filter PSID..."
                    value={resolutionSearch}
                    onChange={(e) => setResolutionSearch(e.target.value)}
                    className="pl-7 pr-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-[10px] outline-none font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={downloadResolutionReport}
                  className="px-3 py-1.5 bg-neutral-900 border border-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Download size={11} /> Excel Log
                </button>
              </div>
            </div>

            {/* Vertical Rising Bar Graph (Request 1: Show as bar graph vertically for all psid users) */}
            {filteredResolutionStandings.length > 0 ? (
              <div className="h-64 border-b border-slate-100 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredResolutionStandings} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="psid" tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: 10 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600, paddingTop: 5 }} />
                    <Bar dataKey="confirmedFraud" name="Confirmed Fraud" fill={RESOLUTION_COLORS.confirmedFraud} stackId="r" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="suspectedFraud" name="Suspected Fraud" fill={RESOLUTION_COLORS.suspectedFraud} stackId="r" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="confirmedGenuine" name="Confirmed Genuine" fill={RESOLUTION_COLORS.confirmedGenuine} stackId="r" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="assumedGenuine" name="Assumed Genuine" fill={RESOLUTION_COLORS.assumedGenuine} stackId="r" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 font-bold uppercase text-[10px]">No graphics to render</div>
            )}

            {/* Stands Data Table list */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                    <th className="py-2 px-3">Officer PSID</th>
                    <th className="py-2 px-2 text-center text-red-650">Confirm Fraud</th>
                    <th className="py-2 px-2 text-center text-amber-500">Suspected Fraud</th>
                    <th className="py-2 px-2 text-center text-emerald-600">Confirm Genuine</th>
                    <th className="py-2 px-2 text-center text-indigo-600">Assumed Genuine</th>
                    <th className="py-2 px-2 text-center font-bold">Total Workload</th>
                    <th className="py-2 px-2 text-center text-indigo-500">Contacted</th>
                    <th className="py-2 px-2 text-center text-amber-500">No Contact</th>
                    <th className="py-2 px-3 text-center text-emerald-600">Close Manual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {filteredResolutionStandings.map((row) => (
                    <tr key={row.psid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-black text-slate-900">{row.psid}</td>
                      <td className="py-2.5 px-2 text-center text-red-600 font-mono">{row.confirmedFraud}</td>
                      <td className="py-2.5 px-2 text-center text-amber-500 font-mono">{row.suspectedFraud}</td>
                      <td className="py-2.5 px-2 text-center text-emerald-600 font-mono">{row.confirmedGenuine}</td>
                      <td className="py-2.5 px-2 text-center text-indigo-600 font-mono">{row.assumedGenuine}</td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-slate-900">{row.totalRib}</td>
                      <td className="py-2.5 px-2 text-center text-indigo-600 font-mono">{row.contacted}</td>
                      <td className="py-2.5 px-2 text-center text-amber-500 font-mono">{row.unableToContact}</td>
                      <td className="py-2.5 px-3 text-center text-emerald-600 font-mono">{row.closeManual}</td>
                    </tr>
                  ))}
                  {filteredResolutionStandings.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-extrabold uppercase text-[10px] tracking-widest">
                        No activity records found for this date
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Span: Daily Overview Ring Chart & Controls (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Day Ring Chart Distribution summary */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day Distribution Ring</span>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">{selectedDate}</span>
              </div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Day Resolution Mix</h3>
              <p className="text-[10px] text-slate-400 mb-4">Pie/Donut layout breakdown of case decisions processed on chosen day</p>
            </div>

            <div className="h-44 flex items-center justify-center">
              {resolutionPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart sm-layout="true">
                    <Pie
                      data={resolutionPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {resolutionPieData.map((entry, index) => {
                        let color = '#cbd5e1';
                        if (entry.name === 'Confirmed Fraud') color = RESOLUTION_COLORS.confirmedFraud;
                        if (entry.name === 'Suspected Fraud') color = RESOLUTION_COLORS.suspectedFraud;
                        if (entry.name === 'Confirmed Genuine') color = RESOLUTION_COLORS.confirmedGenuine;
                        if (entry.name === 'Assumed Genuine') color = RESOLUTION_COLORS.assumedGenuine;

                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Activity size={14} className="animate-pulse" /> Zero Resolutions Mix Today
                </div>
              )}
            </div>

            {/* Custom Interactive Legend Indicators */}
            <div className="space-y-1.5 pt-3 border-t border-slate-150">
              {Object.entries(RESOLUTION_COLORS).map(([key, value]) => {
                const label = key === 'confirmedFraud' ? 'Confirmed Fraud' :
                              key === 'suspectedFraud' ? 'Suspected Fraud' :
                              key === 'confirmedGenuine' ? 'Confirmed Genuine' : 'Assumed Genuine';

                const matchedValue = resolutionPieData.find(item => item.name === label)?.value || 0;
                const percentage = dayStats.total > 0 ? Math.round((matchedValue / dayStats.total) * 100) : 0;

                return (
                  <div key={key} className="flex items-center justify-between text-[11px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: value }} />
                      <span className="text-slate-600">{label}</span>
                    </div>
                    <span className="text-slate-900 font-mono">
                      {matchedValue} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slicers & Filters list widget */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Interactive Day Filters</h4>
              <p className="text-[10px] text-slate-400">Apply granular limits to top statistics cards & donut percentages for the selected day</p>
            </div>

            <div className="space-y-3.5 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Filter Assigned Officer</label>
                <select
                  value={filters.assignedTo}
                  onChange={(e) => setFilters(f => ({ ...f, assignedTo: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg outline-none cursor-pointer"
                >
                  {uniqueAssignees.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Filter Event Type</label>
                <select
                  value={filters.eventType}
                  onChange={(e) => setFilters(f => ({ ...f, eventType: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg outline-none cursor-pointer"
                >
                  {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setFilters({ assignedTo: 'All', eventType: 'All' })}
                disabled={filters.assignedTo === 'All' && filters.eventType === 'All'}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold uppercase tracking-wider rounded-lg text-[9.5px] border border-slate-200 transition-colors disabled:opacity-40"
              >
                Reset Day Filters
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
