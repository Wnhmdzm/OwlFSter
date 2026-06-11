/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
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
} from 'recharts';
import { 
  Users, 
  DollarSign, 
  FileCheck, 
  Filter, 
  RefreshCcw, 
  ArrowUpRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [cases, setCases] = useState<FMSCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    assignedTo: 'All',
    resolution: 'All',
    callResponse: 'All',
    eventType: 'All',
    dateRange: 'All'
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

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCases.forEach(c => {
      const type = c.eventType || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredCases]);

  const uniqueAssignees = useMemo(() => ['All', ...Array.from(new Set(cases.map(c => c.assignedTo))).filter(Boolean)], [cases]);
  const uniqueTypes = useMemo(() => ['All', ...Array.from(new Set(cases.map(c => c.eventType))).filter(Boolean)], [cases]);

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
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="minimal-card p-5">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Value Monitored</p>
           <div className="flex items-end justify-between">
             <p className="text-2xl font-light text-slate-800">{formatCurrency(stats.totalAmount)}</p>
             <div className="bg-blue-50 p-2 rounded-lg text-brand">
                <DollarSign size={20} />
             </div>
           </div>
        </div>
        
        <div className="minimal-card p-5">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Confirmed Fraud</p>
           <div className="flex items-end justify-between">
             <p className="text-3xl font-light text-red-600">{stats.fraudCount}</p>
             <div className="bg-red-50 p-2 rounded-lg text-red-600">
                <AlertTriangle size={20} />
             </div>
           </div>
        </div>

        <div className="minimal-card p-5">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total CIFs</p>
           <div className="flex items-end justify-between">
             <p className="text-3xl font-light text-emerald-600">{stats.totalCif}</p>
             <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                <Users size={20} />
             </div>
           </div>
        </div>

        <div className="minimal-card p-5">
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
        {/* Charts / Progress */}
        <div className="flex flex-col gap-6">
          <div className="minimal-card p-6">
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

          <div className="minimal-card flex-1">
             <div className="px-6 py-4 bg-gray-50/50 border-b border-border flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Slicers & Filters</h3>
                <button onClick={fetchCases} className="text-[10px] font-bold text-brand uppercase tracking-widest flex items-center gap-1 hover:underline">
                  <RefreshCcw size={12} /> Sync Data
                </button>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Slicers from original code */}
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
    </div>
  );
}
