/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { FMSCase } from '../types';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCcw,
  FileSpreadsheet,
  User,
  Users,
  Database as DbIcon,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';

export default function Database() {
  const { profile } = useAuth();
  const [cases, setCases] = useState<FMSCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTab, setSelectedTab] = useState<'all' | 'personal'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingPurge, setConfirmingPurge] = useState(false);

  const initCaseDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId === id) {
      executeDeleteCase(id);
    } else {
      setDeletingId(id);
      setTimeout(() => {
        setDeletingId(prev => prev === id ? null : prev);
      }, 3000);
    }
  };

  const executeDeleteCase = async (id: string) => {
    try {
      await api.delete(`/api/cases/${id}`);
      setDeletingId(null);
      fetchCases();
    } catch (err) {
      console.error(err);
    }
  };

  const initPurgeAll = () => {
    if (confirmingPurge) {
      executePurgeAll();
    } else {
      setConfirmingPurge(true);
      setTimeout(() => {
        setConfirmingPurge(false);
      }, 4000);
    }
  };

  const executePurgeAll = async () => {
    try {
      await api.delete('/api/cases');
      setConfirmingPurge(false);
      fetchCases();
    } catch (err) {
      console.error(err);
    }
  };

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

  // Switch between seeing personal inputs vs all team databases
  const tabFilteredCases = useMemo(() => {
    if (selectedTab === 'personal') {
      const userUid = profile?.uid || profile?.email || '';
      return cases.filter(c => 
        c.createdByUid === userUid || 
        c.createdByName === profile?.displayName ||
        c.createdByUid?.toLowerCase() === profile?.displayName?.toLowerCase()
      );
    }
    return cases;
  }, [cases, selectedTab, profile]);

  const filteredCases = useMemo(() => {
    return tabFilteredCases.filter(c => 
      c.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ruleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.createdByName && c.createdByName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tabFilteredCases, searchTerm]);

  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCases.length / pageSize) || 1;

  const exportToExcel = () => {
    const sheetData = filteredCases.map(c => ({
      'Case Date': c.caseCreatedTime,
      'CIF Number': c.userId,
      'Assigned To': c.assignedTo,
      'Amount (RM)': c.amount,
      'FMS Status': c.fmsStatusAction || 'Pending',
      'Resolution Status': c.resolution || 'Pending',
      'First Call': c.firstCallTime || '',
      'Second Call': c.secondCallTime || '',
      'Third Call': c.thirdCallTime || '',
      'Remarks': c.remarks,
      'Entered By Staff': c.createdByName || c.createdByUid || 'System'
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedTab === 'personal' ? "Personal_FMS_Cases" : "All_FMS_Cases");
    XLSX.writeFile(wb, `FMS_Database_${selectedTab}_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Tab selectors for Personal vs All databases */}
      <div className="flex border-b border-border bg-white p-1 rounded-xl shadow-sm gap-2">
        <button
          onClick={() => { setSelectedTab('all'); setCurrentPage(1); }}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            selectedTab === 'all' 
              ? "bg-brand text-white shadow-lg shadow-blue-100" 
              : "text-slate-400 hover:text-brand hover:bg-slate-50"
          )}
        >
          <Users size={14} />
          See All Databases
        </button>
        <button
          onClick={() => { setSelectedTab('personal'); setCurrentPage(1); }}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            selectedTab === 'personal' 
              ? "bg-brand text-white shadow-lg shadow-blue-100" 
              : "text-slate-400 hover:text-brand hover:bg-slate-50"
          )}
        >
          <User size={14} />
          See Personal Database ({profile?.displayName})
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1 max-w-md">
          <label className="label-minimal">Audit Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by CIF, Staff, or Rule ID..."
              className="input-minimal pl-10 animate-fade-in"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={initPurgeAll}
            className={cn(
              "px-4 py-2 rounded text-[11px] font-bold transition-all uppercase tracking-widest flex items-center gap-2",
              confirmingPurge 
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white animate-pulse" 
                : "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50/50"
            )}
          >
            {confirmingPurge ? <AlertTriangle size={14} className="text-white" /> : <Trash2 size={14} className="text-rose-500" />}
            {confirmingPurge ? "Confirm Clear database?" : "Clear database"}
          </button>
          <button
            onClick={fetchCases}
            className="px-4 py-2 bg-white border border-border text-gray-500 rounded text-[11px] font-bold hover:bg-gray-50 transition-colors uppercase tracking-widest flex items-center gap-2"
          >
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            Re-Sync
          </button>
           <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-brand text-white rounded text-[11px] font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest flex items-center gap-2"
          >
            <FileSpreadsheet size={14} />
            Export Selected Tab
          </button>
        </div>
      </div>

      <div className="minimal-card overflow-hidden">
        <div className="px-6 py-4 bg-gray-50/50 border-b border-border flex justify-between items-center">
           <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
             <DbIcon size={14} className="text-brand" />
             {selectedTab === 'personal' ? 'Personal Operator Repository' : 'Consolidated Operational databases'}
           </h3>
           <div className="flex items-center gap-1.5 grayscale">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">SQL-Sync Live</span>
           </div>
        </div>
         <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold">Case Date</th>
                <th className="px-6 py-4 text-left font-bold">CIF Number</th>
                <th className="px-6 py-4 text-left font-bold">Assigned To</th>
                <th className="px-6 py-4 text-left font-bold">Amount (RM)</th>
                <th className="px-6 py-4 text-left font-bold">FMS Status</th>
                <th className="px-6 py-4 text-left font-bold">Resolution</th>
                <th className="px-6 py-4 text-right font-bold">Who Entered Case (Staff ID)</th>
                <th className="px-6 py-4 text-center font-bold w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                     <RefreshCcw className="animate-spin inline-block text-brand mb-2" />
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing Audit Stream...</p>
                  </td>
                </tr>
              ) : paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">No records present in the local database grid</p>
                  </td>
                </tr>
              ) : (
                paginatedCases.map((c) => (
                  <tr key={c.id} className="group hover:bg-blue-50/30 transition-colors text-xs">
                    <td className="px-6 py-4 text-gray-400 font-mono text-[10px]">{c.caseCreatedTime}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{c.userId}</td>
                    <td className="px-6 py-4 text-gray-500 font-medium">{c.assignedTo}</td>
                    <td className="px-6 py-4 text-brand font-bold font-mono">{formatCurrency(c.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border",
                        c.fmsStatusAction === 'Locked' ? "bg-amber-50 text-amber-600 border-amber-100" : 
                        c.fmsStatusAction === 'Unlock' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        "bg-gray-50 text-gray-500 border-gray-100"
                      )}>
                        {c.fmsStatusAction || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border",
                        c.resolution?.includes('Fraud') ? "bg-red-50 text-red-600 border-red-100" :
                        c.resolution?.includes('Genuine') ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        "bg-blue-50 text-brand border-blue-100"
                      )}>
                        {c.resolution || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded inline-block uppercase tracking-widest">
                        {c.createdByName || c.createdByUid || 'System'}
                      </p>
                      <p className="text-[9px] text-gray-400 font-mono italic mt-0.5">24H_SHIFT_TEAM</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => initCaseDelete(c.id, e)}
                        className={cn(
                          "p-1.5 rounded transition-all inline-flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer",
                          deletingId === c.id 
                            ? "bg-red-500 text-white font-bold text-[9px] px-2 py-1 leading-none animate-pulse" 
                            : "text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100"
                        )}
                        title={deletingId === c.id ? "Click again to confirm" : "Delete Case"}
                      >
                        {deletingId === c.id ? (
                          "Confirm?"
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-border flex items-center justify-between animate-fade-in">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
             Page {currentPage} of {totalPages} (Current View: {filteredCases.length} items)
           </p>
           <div className="flex gap-2">
             <button 
               disabled={currentPage === 1}
               onClick={() => setCurrentPage(p => p - 1)}
               className="p-1.5 bg-white border border-border text-gray-400 rounded-lg hover:text-brand disabled:opacity-30 transition-colors"
             >
               <ChevronLeft size={16} />
             </button>
             <button 
               disabled={currentPage === totalPages}
               onClick={() => setCurrentPage(p => p + 1)}
               className="p-1.5 bg-white border border-border text-gray-400 rounded-lg hover:text-brand disabled:opacity-30 transition-colors"
             >
               <ChevronRight size={16} />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
