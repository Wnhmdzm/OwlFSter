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
  Legend
} from 'recharts';
import { 
  Users, 
  DollarSign, 
  FileCheck, 
  Filter, 
  RefreshCcw, 
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  PhoneCall,
  Activity,
  Award,
  CheckCircle2,
  Lock,
  ArrowRight,
  HelpCircle,
  Download,
  Search,
  Check,
  CheckSquare,
  Square
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const PROD_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'productivity' | 'resolution'>('overview');
  const [cases, setCases] = useState<FMSCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('2026-06-11');
  
  const [filters, setFilters] = useState({
    assignedTo: 'All',
    resolution: 'All',
    callResponse: 'All',
    eventType: 'All',
    dateRange: 'All'
  });

  const [resolutionSearch, setResolutionSearch] = useState('');
  const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>({
    confirmedFraud: true,
    suspectedFraud: true,
    confirmedGenuine: true,
    assumedGenuine: true,
    totalRib: true,
    contacted: true,
    unableToContact: true,
    closeManual: true,
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

  // -----------------------------------------
  // TAB 1: EXECUTIVE OVERVIEW COMPUTATIONS
  // -----------------------------------------
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchAssigned = filters.assignedTo === 'All' || c.assignedTo === filters.assignedTo;
      const matchResolution = filters.resolution === 'All' || c.resolution === filters.resolution;
      const matchResponse = filters.callResponse === 'All' || c.callResponse === filters.callResponse;
      const matchType = filters.eventType === 'All' || c.eventType === filters.eventType;
      return matchAssigned && matchResolution && matchResponse && matchType;
    });
  }, [cases, filters]);

  const stats = useMemo(() => {
    const totalAmount = filteredCases.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalCif = new Set(filteredCases.map(c => c.userId)).size;
    const fraudCount = filteredCases.filter(c => c.resolution === Resolution.CONFIRM_FRAUD).length;
    return { totalAmount, totalCif, fraudCount, total: filteredCases.length };
  }, [filteredCases]);

  const resolutionData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCases.forEach(c => {
      const res = c.resolution || 'Pending';
      counts[res] = (counts[res] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredCases]);

  const uniqueAssignees = useMemo(() => ['All', ...Array.from(new Set(cases.map(c => c.assignedTo))).filter(Boolean)], [cases]);
  const uniqueTypes = useMemo(() => ['All', ...Array.from(new Set(cases.map(c => c.eventType))).filter(Boolean)], [cases]);

  // -----------------------------------------
  // TAB 2: DAILY PRODUCTIVITY COMPUTATIONS
  // -----------------------------------------
  const availableDatesWithCases = useMemo(() => {
    const dates = cases.map(c => {
      if (c.caseCreatedTime && c.caseCreatedTime.trim().length >= 10) {
        return c.caseCreatedTime.trim().substring(0, 10);
      }
      return '';
    }).filter(Boolean);
    return (Array.from(new Set(dates)) as string[]).sort((a, b) => b.localeCompare(a)); // Output latest first
  }, [cases]);

  // Chronological progress trend tracking across subsequent days
  const dailyProgressTrends = useMemo(() => {
    const dateMap: Record<string, {
      date: string;
      // Call responses
      contacted: number;
      unable_contact: number;
      assume_genuine_call: number;
      pending_call: number;
      // Resolutions
      confirm_fraud: number;
      suspected_fraud: number;
      confirm_genuine: number;
      assume_genuine_res: number;
      pending_res: number;
      total: number;
    }> = {};

    cases.forEach(c => {
      if (!c.caseCreatedTime) return;
      const date = c.caseCreatedTime.trim().substring(0, 10);
      if (!date) return;

      if (!dateMap[date]) {
        dateMap[date] = {
          date,
          contacted: 0,
          unable_contact: 0,
          assume_genuine_call: 0,
          pending_call: 0,
          confirm_fraud: 0,
          suspected_fraud: 0,
          confirm_genuine: 0,
          assume_genuine_res: 0,
          pending_res: 0,
          total: 0
        };
      }

      const row = dateMap[date];
      row.total += 1;

      // Call Response
      const resp = c.callResponse;
      if (resp === CallResponse.CONTACTED) {
        row.contacted += 1;
      } else if (resp === CallResponse.UNABLE_TO_CONTACT) {
        row.unable_contact += 1;
      } else if (resp === CallResponse.ASSUME_GENUINE) {
        row.assume_genuine_call += 1;
      } else {
        row.pending_call += 1;
      }

      // Resolution
      const res = c.resolution;
      if (res === Resolution.CONFIRM_FRAUD) {
        row.confirm_fraud += 1;
      } else if (res === Resolution.SUSPECTED_FRAUD) {
        row.suspected_fraud += 1;
      } else if (res === Resolution.CONFIRM_GENUINE) {
        row.confirm_genuine += 1;
      } else if (res === Resolution.ASSUME_GENUINE) {
        row.assume_genuine_res += 1;
      } else {
        row.pending_res += 1;
      }
    });

    // Sort ascending for timeline display (left-to-right flow flow)
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [cases]);

  // All Staff contribution breakdown for the currently selected day
  const teamDailyProductivity = useMemo(() => {
    const dayCases = cases.filter(c => c.caseCreatedTime && c.caseCreatedTime.startsWith(selectedDate));
    
    const staffStats: Record<string, {
      staffId: string;
      totalCases: number;
      totalAmount: number;
      contactedCount: number;
      resolvedCount: number;
    }> = {};

    dayCases.forEach(c => {
      const staff = c.assignedTo || 'System / Unassigned';
      if (!staffStats[staff]) {
        staffStats[staff] = {
          staffId: staff,
          totalCases: 0,
          totalAmount: 0,
          contactedCount: 0,
          resolvedCount: 0
        };
      }
      const item = staffStats[staff];
      item.totalCases += 1;
      item.totalAmount += (c.amount || 0);
      if (c.callResponse === CallResponse.CONTACTED) {
        item.contactedCount += 1;
      }
      if (c.resolution && c.resolution !== 'Pending') {
        item.resolvedCount += 1;
      }
    });

    return Object.values(staffStats).sort((a, b) => b.totalCases - a.totalCases);
  }, [cases, selectedDate]);

  // Filter cases strictly matching chosen date (by caseCreatedTime matching prefix of YYYY-MM-DD)
  const productivityCases = useMemo(() => {
    return cases.filter(c => {
      if (!c.caseCreatedTime) return false;
      return c.caseCreatedTime.startsWith(selectedDate);
    });
  }, [cases, selectedDate]);

  // Dynamic daily stats
  const productivityStats = useMemo(() => {
    const totalCases = productivityCases.length;
    const totalAmount = productivityCases.reduce((sum, c) => sum + (c.amount || 0), 0);
    const uniqueCifs = new Set(productivityCases.map(c => c.userId).filter(Boolean)).size;
    const avgRiskScore = totalCases > 0 
      ? Math.round(productivityCases.reduce((sum, c) => sum + (c.riskScore || 0), 0) / totalCases) 
      : 0;
    
    return { totalCases, totalAmount, uniqueCifs, avgRiskScore };
  }, [productivityCases]);

  // How many call responses for each category on chosen date
  const productivityCallResponseStats = useMemo(() => {
    const counts: Record<string, number> = {
      [CallResponse.CONTACTED]: 0,
      [CallResponse.UNABLE_TO_CONTACT]: 0,
      [CallResponse.ASSUME_GENUINE]: 0,
      'Pending / Not Called': 0
    };

    productivityCases.forEach(c => {
      const resp = c.callResponse;
      if (resp && counts[resp] !== undefined) {
        counts[resp] += 1;
      } else {
        counts['Pending / Not Called'] += 1;
      }
    });

    return Object.entries(counts).map(([category, count]) => ({
      category,
      count,
      percentage: productivityCases.length > 0 ? Math.round((count / productivityCases.length) * 100) : 0
    }));
  }, [productivityCases]);

  // How many resolutions by category on chosen date
  const productivityResolutionStats = useMemo(() => {
    const counts: Record<string, number> = {
      [Resolution.CONFIRM_FRAUD]: 0,
      [Resolution.SUSPECTED_FRAUD]: 0,
      [Resolution.CONFIRM_GENUINE]: 0,
      [Resolution.ASSUME_GENUINE]: 0,
      'Pending Resolution': 0
    };

    productivityCases.forEach(c => {
      const res = c.resolution;
      if (res && counts[res] !== undefined) {
        counts[res] += 1;
      } else {
        counts['Pending Resolution'] += 1;
      }
    });

    return Object.entries(counts).map(([category, count]) => ({
      category,
      count,
      percentage: productivityCases.length > 0 ? Math.round((count / productivityCases.length) * 100) : 0
    }));
  }, [productivityCases]);

  const getCallResponseColor = (cat: string) => {
    switch (cat) {
      case CallResponse.CONTACTED: return 'bg-indigo-600';
      case CallResponse.UNABLE_TO_CONTACT: return 'bg-amber-500';
      case CallResponse.ASSUME_GENUINE: return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  const getResolutionColor = (cat: string) => {
    switch (cat) {
      case Resolution.CONFIRM_FRAUD: return 'bg-red-600';
      case Resolution.SUSPECTED_FRAUD: return 'bg-amber-500';
      case Resolution.CONFIRM_GENUINE: return 'bg-emerald-500';
      case Resolution.ASSUME_GENUINE: return 'bg-violet-600';
      default: return 'bg-slate-400';
    }
  };

  const resolutionStandings = useMemo(() => {
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

    cases.forEach(c => {
      const psid = c.assignedTo || 'Unassigned';
      
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

      // 1. FMS Resolutions Sum calculations:
      const res = c.resolution;
      if (res === Resolution.CONFIRM_FRAUD) {
        row.confirmedFraud += 1;
        row.totalRib += 1;
      } else if (res === Resolution.SUSPECTED_FRAUD) {
        row.suspectedFraud += 1;
        row.totalRib += 1;
      } else if (res === Resolution.CONFIRM_GENUINE) {
        row.confirmedGenuine += 1;
        row.totalRib += 1;
      } else if (res === Resolution.ASSUME_GENUINE) {
        row.assumedGenuine += 1;
        row.totalRib += 1;
      }

      // 2. Call response Sum calculations:
      const resp = c.callResponse;
      if (resp === CallResponse.CONTACTED) {
        row.contacted += 1;
      } else if (resp === CallResponse.UNABLE_TO_CONTACT || (resp && typeof resp === 'string' && resp.toLowerCase().includes('unable'))) {
        row.unableToContact += 1;
      } else if (resp === CallResponse.CLOSE_MANUAL || (resp && typeof resp === 'string' && resp.toLowerCase().includes('close manual'))) {
        row.closeManual += 1;
      }
    });

    return Object.values(stands).sort((a, b) => b.totalRib - a.totalRib);
  }, [cases]);

  const filteredResolutionStandings = useMemo(() => {
    return resolutionStandings.filter(item => 
      item.psid.toLowerCase().includes(resolutionSearch.toLowerCase())
    );
  }, [resolutionSearch, resolutionStandings]);

  const downloadResolutionReport = () => {
    const dataToExport = filteredResolutionStandings.map((r, i) => ({
      'No': i + 1,
      'Officer (PSID)': r.psid,
      'Confirmed Fraud': r.confirmedFraud,
      'Suspected Fraud': r.suspectedFraud,
      'Confirmed Genuine': r.confirmedGenuine,
      'Assumed Genuine': r.assumedGenuine,
      'Total RIB': r.totalRib,
      'Contacted': r.contacted,
      'Unable to Contact': r.unableToContact,
      'Close Manual': r.closeManual
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resolution Summary');
    
    // Auto-fit columns
    const max_len = [5, 20, 15, 15, 15, 15, 12, 10, 18, 15];
    worksheet['!cols'] = max_len.map(w => ({ wch: w }));

    XLSX.writeFile(workbook, `FMS_Resolution_Scorecard_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12">
        <RefreshCcw className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium tracking-wide animate-pulse uppercase text-sm">Synchronizing Cloud Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Interactive Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Dashboard</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mt-1">
            Real-time Multi-user Intelligence Suite
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            id="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer",
              activeTab === 'overview' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Overview Progress
          </button>
          <button
            id="tab-productivity"
            onClick={() => setActiveTab('productivity')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'productivity' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Layers size={13} className={activeTab === 'productivity' ? "text-indigo-600" : "text-slate-400"} />
            Productivity Monitor
          </button>
          <button
            id="tab-resolution"
            onClick={() => setActiveTab('resolution')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'resolution' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Award size={13} className={activeTab === 'resolution' ? "text-indigo-600" : "text-slate-400"} />
            Resolution Dashboard
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <React.Fragment>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="minimal-card p-5" id="metric-value">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Value Monitored</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-light text-slate-800">{formatCurrency(stats.totalAmount)}</p>
                <div className="bg-blue-50 p-2 rounded-lg text-brand">
                  <DollarSign size={20} />
                </div>
              </div>
            </div>
            
            <div className="minimal-card p-5" id="metric-fraud">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Confirmed Fraud</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-light text-red-600">{stats.fraudCount}</p>
                <div className="bg-red-50 p-2 rounded-lg text-red-600">
                  <AlertTriangle size={20} />
                </div>
              </div>
            </div>

            <div className="minimal-card p-5" id="metric-cif">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total CIFs</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-light text-emerald-600">{stats.totalCif}</p>
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                  <Users size={20} />
                </div>
              </div>
            </div>

            <div className="minimal-card p-5" id="metric-cases">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Cases</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-light text-slate-800">{stats.total}</p>
                <div className="bg-slate-50 p-2 rounded-lg text-slate-400">
                  <FileCheck size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-6">
              <div className="minimal-card p-6" id="overview-progress">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resolution Progress</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                    <span className="text-[10px] font-bold text-brand uppercase tracking-tighter">Real-time Stream</span>
                  </div>
                </div>
                <div className="space-y-6">
                  {resolutionData.map((item) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight">
                        <span className="text-gray-500">{item.name}</span>
                        <span className="text-slate-800">{item.value} ({Math.round((item.value / (stats.total || 1)) * 100)}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.value / (stats.total || 1)) * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={cn(
                            "h-full rounded-full",
                            item.name.includes('Genuine') ? "bg-emerald-500" : 
                            item.name.includes('Fraud') ? "bg-red-500" : "bg-brand"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="minimal-card flex-1" id="overview-filters">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-border flex justify-between items-center">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Slicers & Filters</h3>
                  <button onClick={fetchCases} className="text-[10px] font-bold text-brand uppercase tracking-widest flex items-center gap-1 hover:underline cursor-pointer">
                    <RefreshCcw size={12} /> Sync Data
                  </button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Staff</label>
                    <select 
                      value={filters.assignedTo}
                      onChange={(e) => setFilters(f => ({ ...f, assignedTo: e.target.value }))}
                      className="input-minimal text-xs py-1.5"
                    >
                      {uniqueAssignees.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                    <select 
                      value={filters.eventType}
                      onChange={(e) => setFilters(f => ({ ...f, eventType: e.target.value }))}
                      className="input-minimal text-xs py-1.5"
                    >
                      {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Resolution</label>
                    <select 
                      value={filters.resolution}
                      onChange={(e) => setFilters(f => ({ ...f, resolution: e.target.value }))}
                      className="input-minimal text-xs py-1.5"
                    >
                      <option value="All">All Results</option>
                      {Object.values(Resolution).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Call</label>
                    <select 
                      value={filters.callResponse}
                      onChange={(e) => setFilters(f => ({ ...f, callResponse: e.target.value }))}
                      className="input-minimal text-xs py-1.5"
                    >
                      <option value="All">All Calls</option>
                      {Object.values(CallResponse).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </React.Fragment>
      ) : activeTab === 'productivity' ? (
        <React.Fragment>
          {/* PRODUCTIVITY VIEW SECTION */}
          <div className="space-y-6" id="productivity-view">
            {/* Date Picker and Quick Selection */}
            <div className="minimal-card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={14} /> Choose Evaluation Date
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Select any date from the system to generate immediate staff productivity, call response summaries, and resolutions metrics.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="pl-10 pr-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 hover:border-indigo-400 rounded-xl outline-none font-bold text-sm tracking-wide shadow-sm focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all cursor-pointer"
                    />
                  </div>
                  <button 
                    onClick={fetchCases}
                    title="Reload cases from database"
                    className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer"
                  >
                    <RefreshCcw size={16} />
                  </button>
                </div>
              </div>

              {/* Quick links for dates that actually have cases */}
              {availableDatesWithCases.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold mr-2">Available System Dates:</span>
                  <div className="inline-flex flex-wrap gap-1.5 mt-1 sm:mt-0">
                    {availableDatesWithCases.map(date => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg transition-all truncate border",
                          selectedDate === date 
                            ? "bg-indigo-600 text-white border-indigo-600 shadow" 
                            : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                        )}
                      >
                        {date} {date === '2026-06-11' ? '🔥' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Daily Productivity Summary metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1">Daily Cases Purview</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-light text-slate-900">{productivityStats.totalCases}</p>
                  <div className="bg-indigo-600 text-white p-2 rounded-xl">
                    <FileCheck size={20} />
                  </div>
                </div>
                <div className="text-[10px] text-indigo-600/70 font-semibold uppercase tracking-wider mt-2 flex items-center gap-1">
                  <TrendingUp size={12} /> Cases monitored for {selectedDate}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1">Financial Throughput</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-light text-slate-900">{formatCurrency(productivityStats.totalAmount)}</p>
                  <div className="bg-indigo-600 text-white p-2 rounded-xl">
                    <DollarSign size={20} />
                  </div>
                </div>
                <div className="text-[10px] text-indigo-600/70 font-semibold uppercase tracking-wider mt-2">
                  RM cumulative volume
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1">Day Unique CIFs</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-light text-slate-900">{productivityStats.uniqueCifs}</p>
                  <div className="bg-indigo-600 text-white p-2 rounded-xl">
                    <Users size={20} />
                  </div>
                </div>
                <div className="text-[10px] text-indigo-600/70 font-semibold uppercase tracking-wider mt-2">
                  Distinct account IDs assessed
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1">Average Risk Score</p>
                <div className="flex items-end justify-between">
                  <p className={`text-3xl font-bold ${productivityStats.avgRiskScore >= 70 ? 'text-red-600' : 'text-indigo-600'}`}>
                    {productivityStats.avgRiskScore}
                  </p>
                  <div className="bg-indigo-600 text-white p-2 rounded-xl">
                    <Activity size={20} />
                  </div>
                </div>
                <div className="text-[10px] text-indigo-600/70 font-semibold uppercase tracking-wider mt-2">
                  System mean severity ratio
                </div>
              </div>
            </div>

            {productivityCases.length === 0 ? (
              <div className="minimal-card p-12 text-center" id="productivity-empty">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="p-4 bg-amber-50 text-amber-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto border border-amber-200">
                    <HelpCircle size={32} />
                  </div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">No Productivity Data Available</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    There are currently no FMS entries saved with case created time on <strong className="font-mono">{selectedDate}</strong>. 
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-left text-xs text-slate-600 flex gap-2">
                    <span className="text-indigo-600 font-extrabold shrink-0">💡 Recommendation:</span>
                    <div>
                      Try clicking <button onClick={() => setSelectedDate('2026-06-11')} className="text-indigo-600 underline font-semibold hover:text-indigo-700">2026-06-11</button> in the quick selection bar above to see the pre-populated cases data.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* DAILY CHRONOLOGICAL PROGRESS BAR CHARTS (All dates trend) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="productivity-bar-trends">
                  
                  {/* Category of Call Response by Date */}
                  <div className="minimal-card p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <PhoneCall size={14} className="text-indigo-600" /> Daily Call Responses Trend (by Day)
                        </h4>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                          Progress Bar Chart
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mb-6">
                        System-wide call progress breakdown compared chronologically over subsequent calendar days.
                      </p>
                    </div>

                    <div className="h-64 pt-4 border-t border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dailyProgressTrends}
                          margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94a3b8" />
                          <Tooltip 
                            contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: 10 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600, paddingTop: 10 }} />
                          <Bar dataKey="contacted" name="Contacted" stackId="a" fill="#6366f1" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="unable_contact" name="Unable to Contact" stackId="a" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="assume_genuine_call" name="Assume Genuine" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="pending_call" name="Pending Call" stackId="a" fill="#64748b" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Category of Resolution by Date */}
                  <div className="minimal-card p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <Award size={14} className="text-indigo-600" /> Daily Resolutions Trend (by Day)
                        </h4>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                          Progress Bar Chart
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mb-6">
                        Summary of final system resolutions categorized and saved for cases handled across calendar days.
                      </p>
                    </div>

                    <div className="h-64 pt-4 border-t border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dailyProgressTrends}
                          margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94a3b8" />
                          <Tooltip 
                            contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: 10 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 9, fontWeight: 600, paddingTop: 10 }} />
                          <Bar dataKey="confirm_fraud" name="Confirm Fraud" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="suspected_fraud" name="Suspected Fraud" stackId="a" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="confirm_genuine" name="Confirm Genuine" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="assume_genuine_res" name="Assume Genuine" stackId="a" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="pending_res" name="Pending" stackId="a" fill="#64748b" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* SINGLE DAY DRILLDOWN BREAKDOWNS (Bar & Pie widgets) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="productivity-charts-grid">
                  
                  {/* CALL RESPONSE PRODUCTIVITY VIEW */}
                  <div className="minimal-card p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <PhoneCall size={14} className="text-indigo-600" /> Call Response Volume ({selectedDate})
                        </h4>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                          {productivityCases.length} Inputs
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mb-6">
                        Breakdown of customer dialogue actions performed during the selected date's response window.
                      </p>

                      {/* Progress bars */}
                      <div className="space-y-4 mb-6">
                        {productivityCallResponseStats.map(stat => (
                          <div key={stat.category} className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                              <span>{stat.category}</span>
                              <span>{stat.count} cases ({stat.percentage}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stat.percentage}%` }}
                                className={cn("h-full rounded-full", getCallResponseColor(stat.category))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="h-60 pt-4 border-t border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={productivityCallResponseStats}
                          margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="category" tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94a3b8" />
                          <Tooltip 
                            contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {productivityCallResponseStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={
                                entry.category === CallResponse.CONTACTED ? '#6366f1' :
                                entry.category === CallResponse.UNABLE_TO_CONTACT ? '#f59e0b' :
                                entry.category === CallResponse.ASSUME_GENUINE ? '#10b981' : '#64748b'
                              } />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* RESOLUTION BY CATEGORY VIEW */}
                  <div className="minimal-card p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <Award size={14} className="text-indigo-600" /> Resolution Outcomes ({selectedDate})
                        </h4>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                          Daily Decisions
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mb-6">
                        Definitive categorization matching the risk engine output for cases handled on {selectedDate}.
                      </p>

                      {/* Progress bars */}
                      <div className="space-y-4 mb-6">
                        {productivityResolutionStats.map(stat => (
                          <div key={stat.category} className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                              <span>{stat.category}</span>
                              <span>{stat.count} cases ({stat.percentage}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stat.percentage}%` }}
                                className={cn("h-full rounded-full", getResolutionColor(stat.category))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="h-60 pt-4 border-t border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={productivityResolutionStats.filter(item => item.count > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="category"
                          >
                            {productivityResolutionStats.filter(item => item.count > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={
                                entry.category === Resolution.CONFIRM_FRAUD ? '#ef4444' :
                                entry.category === Resolution.SUSPECTED_FRAUD ? '#f59e0b' :
                                entry.category === Resolution.CONFIRM_GENUINE ? '#10b981' :
                                entry.category === Resolution.ASSUME_GENUINE ? '#8b5cf6' : '#64748b'
                              } />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 600, paddingBottom: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* SHARED ALL-STAFF PERFORMANCE LEADERBOARD (Visible to all) */}
                <div className="minimal-card p-6" id="all-staff-leaderboard">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} className="text-indigo-600" /> All Staff Daily Productivity Standings ({selectedDate})
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Operational transparent scorecard detailing workload volumes, call metrics and resolution percentages for all active operators.
                      </p>
                    </div>
                    <div className="text-[10px] bg-slate-50 text-indigo-600 border border-slate-200/50 uppercase px-3 py-1 rounded-xl font-bold tracking-wider self-start sm:self-auto flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" /> Accessible by All Staff
                    </div>
                  </div>

                  {teamDailyProductivity.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4">No staff work record available for this day.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                            <th className="py-3 px-4">Operator Name</th>
                            <th className="py-3 px-4 text-center">Cases Assessed</th>
                            <th className="py-3 px-4 text-right">Volume Handled</th>
                            <th className="py-3 px-4 text-center">Calls Conducted</th>
                            <th className="py-3 px-4 text-center">Resolutions Logged</th>
                            <th className="py-3 px-4 text-right">Daily Load Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {teamDailyProductivity.map((staff, index) => {
                            const totalDayCases = productivityStats.totalCases || 1;
                            const loadShare = Math.round((staff.totalCases / totalDayCases) * 100);
                            return (
                              <tr key={staff.staffId} className="hover:bg-slate-50/50 transition-all font-medium text-slate-700">
                                <td className="py-3 px-4 flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200/40 text-[9px] flex items-center justify-center font-bold text-slate-500 font-mono">
                                    {index + 1}
                                  </div>
                                  <span className="text-slate-900 font-bold">{staff.staffId}</span>
                                </td>
                                <td className="py-3 px-4 text-center font-extrabold text-slate-800 bg-slate-50/40">
                                  {staff.totalCases}
                                </td>
                                <td className="py-3 px-4 text-right text-slate-600 font-mono">
                                  {formatCurrency(staff.totalAmount)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100/50">
                                    {staff.contactedCount} contacted
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100/50">
                                    {staff.resolvedCount} completed
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-[10px] text-slate-500 font-mono">{loadShare}%</span>
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                                      <div 
                                        className="h-full bg-indigo-500 rounded-full" 
                                        style={{ width: `${loadShare}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </React.Fragment>
      ) : (
        <React.Fragment>
          {/* RESOLUTION GRAPH VIEW SECTION */}
          <div className="space-y-6 animate-fade-in" id="resolution-dashboard-view">
            <div className="minimal-card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <Award size={14} /> Resolution Standings & Call Analyses
                  </h3>
                  <p className="text-slate-500 text-xs">
                    View vertical bar graphs of FMS resolutions (Confirmed Fraud, Suspected Fraud, Confirmed Genuine, Assumed Genuine, Total RIB) and Call Responses (Contacted, Unable To Contact, Close Manual) aggregated across all PSID Users/Officers.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={downloadResolutionReport}
                    className="px-4 py-2.5 bg-neutral-900 border border-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow cursor-pointer transition-all"
                    title="Export scorecards to excel spreadsheet"
                  >
                    <Download size={15} /> Export Standings
                  </button>
                </div>
              </div>
            </div>

            {/* Metric pill toggler */}
            <div className="minimal-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Interactive Metric Visibility Filter
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">Toggle buttons below to customize which vertical bars are shown on the comparison graph securely.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setVisibleMetrics({
                        confirmedFraud: true, suspectedFraud: true, confirmedGenuine: true, assumedGenuine: true, totalRib: true,
                        contacted: false, unableToContact: false, closeManual: false
                      });
                    }}
                    className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all"
                  >
                    FMS Preset Only
                  </button>
                  <button
                    onClick={() => {
                      setVisibleMetrics({
                        confirmedFraud: false, suspectedFraud: false, confirmedGenuine: false, assumedGenuine: false, totalRib: false,
                        contacted: true, unableToContact: true, closeManual: true
                      });
                    }}
                    className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition-all"
                  >
                    Calls Preset Only
                  </button>
                  <button
                    onClick={() => {
                      setVisibleMetrics({
                        confirmedFraud: true, suspectedFraud: true, confirmedGenuine: true, assumedGenuine: true, totalRib: true,
                        contacted: true, unableToContact: true, closeManual: true
                      });
                    }}
                    className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => {
                      setVisibleMetrics({
                        confirmedFraud: false, suspectedFraud: false, confirmedGenuine: false, assumedGenuine: false, totalRib: false,
                        contacted: false, unableToContact: false, closeManual: false
                      });
                    }}
                    className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { key: 'confirmedFraud', label: 'Confirmed Fraud', activeBg: 'bg-red-50 border-red-300 text-red-700 ring-1 ring-red-200' },
                  { key: 'suspectedFraud', label: 'Suspected Fraud', activeBg: 'bg-amber-50 border-amber-300 text-amber-700 ring-1 ring-amber-200' },
                  { key: 'confirmedGenuine', label: 'Confirmed Genuine', activeBg: 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-1 ring-emerald-200' },
                  { key: 'assumedGenuine', label: 'Assumed Genuine', activeBg: 'bg-violet-50 border-violet-300 text-violet-700 ring-1 ring-violet-200' },
                  { key: 'totalRib', label: 'Total RIB', activeBg: 'bg-slate-50 border-slate-350 text-slate-700 ring-1 ring-slate-200' },
                  { key: 'contacted', label: 'Contacted', activeBg: 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-200' },
                  { key: 'unableToContact', label: 'Unable to Contact', activeBg: 'bg-orange-50 border-orange-300 text-orange-700 ring-1 ring-orange-200' },
                  { key: 'closeManual', label: 'Close Manual', activeBg: 'bg-pink-50 border-pink-300 text-pink-700 ring-1 ring-pink-200' }
                ].map(opt => {
                  const isActive = !!visibleMetrics[opt.key];
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setVisibleMetrics(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                      className={cn(
                        "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm",
                        isActive 
                          ? opt.activeBg
                          : 'bg-white border-slate-200 text-slate-450 hover:bg-slate-50'
                      )}
                    >
                      {isActive ? (
                        <CheckSquare size={14} className="text-slate-800" />
                      ) : (
                        <Square size={14} className="text-slate-400" />
                      )}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vertical Bar Graph Card */}
            <div className="minimal-card p-6">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={14} className="text-indigo-600" /> All-Staff Resolution Standings Comparison (Vertical Bar Graph)
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Compare performance metrics vertically side-by-side. PSIDs are graphed chronologically on the horizontal plane.
                  </p>
                </div>
                <div className="text-[10px] font-bold bg-neutral-100 text-neutral-650 px-2 py-0.5 rounded-md uppercase">
                  Vertical Bars Graphed
                </div>
              </div>

              <div className="h-96 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={resolutionStandings}
                    margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="psid" tick={{ fill: '#475569', fontSize: 10, fontWeight: '700' }} stroke="#cbd5e1" />
                    <YAxis tick={{ fill: '#475569', fontSize: 10, fontWeight: '700' }} stroke="#cbd5e1" />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '11px', fontWeight: 'bold' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '600', paddingTop: '10px' }} />
                    
                    {visibleMetrics.confirmedFraud && <Bar dataKey="confirmedFraud" name="Confirmed Fraud" fill="#ef4444" radius={[3, 3, 0, 0]} />}
                    {visibleMetrics.suspectedFraud && <Bar dataKey="suspectedFraud" name="Suspected Fraud" fill="#f59e0b" radius={[3, 3, 0, 0]} />}
                    {visibleMetrics.confirmedGenuine && <Bar dataKey="confirmedGenuine" name="Confirmed Genuine" fill="#10b981" radius={[3, 3, 0, 0]} />}
                    {visibleMetrics.assumedGenuine && <Bar dataKey="assumedGenuine" name="Assumed Genuine" fill="#8b5cf6" radius={[3, 3, 0, 0]} />}
                    {visibleMetrics.totalRib && <Bar dataKey="totalRib" name="Total RIB" fill="#64748b" radius={[3, 3, 0, 0]} />}
                    {visibleMetrics.contacted && <Bar dataKey="contacted" name="Contacted" fill="#6366f1" radius={[3, 3, 0, 0]} />}
                    {visibleMetrics.unableToContact && <Bar dataKey="unableToContact" name="Unable to Contact" fill="#f97316" radius={[3, 3, 0, 0]} />}
                    {visibleMetrics.closeManual && <Bar dataKey="closeManual" name="Close Manual" fill="#ec4899" radius={[3, 3, 0, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Scorecard standings spreadsheet grid */}
            <div className="minimal-card p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} className="text-indigo-600" /> Granular Resolution Standing Scorecards
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Search and inspect exact sums of resolutions log-sheets recorded for every operational PSID profile.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={resolutionSearch}
                    onChange={(e) => setResolutionSearch(e.target.value)}
                    placeholder="Search by PSID name..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-50/85 border border-slate-250 hover:border-slate-350 focus:border-indigo-500 text-xs font-semibold rounded-xl outline-none transition-all"
                  />
                </div>
              </div>

              {filteredResolutionStandings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-450 italic text-xs uppercase tracking-wider font-extrabold">No matching officers found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest bg-slate-50/50">
                        <th className="py-3 px-4">No</th>
                        <th className="py-3 px-4">Officer (PSID)</th>
                        <th className="py-3 px-4 text-center text-red-655 font-bold">Confirmed Fraud</th>
                        <th className="py-3 px-4 text-center text-amber-655 font-bold">Suspected Fraud</th>
                        <th className="py-3 px-4 text-center text-emerald-655 font-bold">Confirmed Genuine</th>
                        <th className="py-3 px-4 text-center text-violet-655 font-bold">Assumed Genuine</th>
                        <th className="py-3 px-4 text-center text-indigo-750 font-black">Total RIB</th>
                        <th className="py-3 px-4 text-center text-indigo-600">Contacted</th>
                        <th className="py-3 px-4 text-center text-orange-600">Unable To Contact</th>
                        <th className="py-3 px-4 text-center text-pink-600">Close Manual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                      {filteredResolutionStandings.map((row, index) => (
                        <tr key={row.psid} className="hover:bg-slate-50/80 transition-all">
                          <td className="py-3.5 px-4 text-slate-400 text-[10px] font-mono">{index + 1}</td>
                          <td className="py-3.5 px-4 text-slate-900 font-black tracking-tight">{row.psid}</td>
                          
                          {/* FMS sum columns */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-red-600">{row.confirmedFraud}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-500">{row.suspectedFraud}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600">{row.confirmedGenuine}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-violet-600">{row.assumedGenuine}</td>
                          
                          {/* Total RIB Column */}
                          <td className="py-3.5 px-4 text-center font-mono font-black text-indigo-700 font-extrabold bg-indigo-50/20">
                            {row.totalRib}
                          </td>

                          {/* Call Response columns */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-600 bg-indigo-50/5">{row.contacted}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-orange-500 bg-orange-50/5">{row.unableToContact}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-pink-500 bg-pink-50/5">{row.closeManual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
