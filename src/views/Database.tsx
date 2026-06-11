/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { FMSCase } from '../types';
import { formatCurrency, getTurnaroundTime } from '../lib/utils';
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
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
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
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

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
      'TAT': getTurnaroundTime(c.caseAssignedTime, c.firstCallTime),
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
                <th className="px-6 py-4 text-left font-bold">TAT</th>
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
                  <td colSpan={9} className="px-6 py-12 text-center">
                     <RefreshCcw className="animate-spin inline-block text-brand mb-2" />
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing Audit Stream...</p>
                  </td>
                </tr>
              ) : paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">No records present in the local database grid</p>
                  </td>
                </tr>
              ) : (
                paginatedCases.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr className={cn(
                      "group hover:bg-slate-50 transition-colors text-xs border-b border-border",
                      expandedCaseId === c.id && "bg-indigo-50/20 hover:bg-indigo-50/20"
                    )}>
                      <td className="px-6 py-4 text-gray-400 font-mono text-[10px]">{c.caseCreatedTime}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{c.userId}</td>
                      <td className="px-6 py-4 text-gray-500 font-medium">{c.assignedTo}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono font-bold">
                        {getTurnaroundTime(c.caseAssignedTime, c.firstCallTime)}
                      </td>
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setExpandedCaseId(expandedCaseId === c.id ? null : c.id)}
                            className={cn(
                              "p-1.5 rounded transition-all inline-flex items-center justify-center gap-1 cursor-pointer font-bold border text-[9px] uppercase tracking-wider",
                              expandedCaseId === c.id
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-black shadow-sm"
                                : "bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30"
                            )}
                            title="View call comments & logs"
                          >
                            {expandedCaseId === c.id ? (
                              <ChevronUp size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )}
                            <span>{expandedCaseId === c.id ? "Hide" : "Logs"}</span>
                          </button>

                          <button
                            onClick={(e) => initCaseDelete(c.id, e)}
                            className={cn(
                              "p-1.5 rounded transition-all inline-flex items-center justify-center cursor-pointer border text-[9px] uppercase tracking-wider font-bold",
                              deletingId === c.id 
                                ? "bg-red-500 text-white border-red-600 animate-pulse font-black" 
                                : "bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 opacity-0 group-hover:opacity-100"
                            )}
                            title={deletingId === c.id ? "Click again to confirm" : "Delete Case"}
                          >
                            {deletingId === c.id ? "Sure?" : <Trash2 size={12} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedCaseId === c.id && (
                      <tr className="bg-slate-50/80 border-b border-border">
                        <td colSpan={9} className="px-6 py-5">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Call Verification timeline - cols: 5 */}
                            <div className="lg:col-span-5 space-y-4">
                              <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  Call Verification Logs
                                </h4>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2">
                                {/* First Call */}
                                <div className={cn(
                                  "p-3 rounded-lg border flex flex-col justify-between min-h-[75px] transition-all",
                                  c.firstCallTime ? "bg-emerald-50/80 border-emerald-100 text-emerald-950" : "bg-white border-gray-200 text-gray-400"
                                )}>
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest block opacity-75">1st Call</span>
                                    <span className={cn(
                                      "text-[10px] font-mono font-bold block mt-1",
                                      c.firstCallTime ? "text-emerald-700" : "text-gray-400 italic"
                                    )}>
                                      {c.firstCallTime || 'Not Call yet'}
                                    </span>
                                  </div>
                                  {c.firstCallTime && (
                                    <span className="text-[9px] font-extrabold uppercase mt-1.5 inline-block bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded text-center truncate">
                                      {c.callResponse || 'Contacted'}
                                    </span>
                                  )}
                                </div>

                                {/* Second Call */}
                                <div className={cn(
                                  "p-3 rounded-lg border flex flex-col justify-between min-h-[75px] transition-all",
                                  c.secondCallTime ? "bg-emerald-50/80 border-emerald-100 text-emerald-950" : "bg-white border-gray-200 text-gray-400"
                                )}>
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest block opacity-75">2nd Call</span>
                                    <span className={cn(
                                      "text-[10px] font-mono font-bold block mt-1",
                                      c.secondCallTime ? "text-emerald-700" : "text-gray-400 italic"
                                    )}>
                                      {c.secondCallTime || 'Not Call yet'}
                                    </span>
                                  </div>
                                  {c.secondCallTime && (
                                    <span className="text-[9px] font-extrabold uppercase mt-1.5 inline-block bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded text-center truncate">
                                      {c.callResponse || 'Contacted'}
                                    </span>
                                  )}
                                </div>

                                {/* Third Call */}
                                <div className={cn(
                                  "p-3 rounded-lg border flex flex-col justify-between min-h-[75px] transition-all",
                                  c.thirdCallTime ? "bg-emerald-50/80 border-emerald-100 text-emerald-950" : "bg-white border-gray-200 text-gray-400"
                                )}>
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest block opacity-75">3rd Call</span>
                                    <span className={cn(
                                      "text-[10px] font-mono font-bold block mt-1",
                                      c.thirdCallTime ? "text-emerald-700" : "text-gray-400 italic"
                                    )}>
                                      {c.thirdCallTime || 'Not Call yet'}
                                    </span>
                                  </div>
                                  {c.thirdCallTime && (
                                    <span className="text-[9px] font-extrabold uppercase mt-1.5 inline-block bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded text-center truncate">
                                      {c.callResponse || 'Contacted'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] bg-white p-3 rounded-lg border border-gray-100">
                                <div>
                                  <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider block">Rule ID</span>
                                  <span className="font-mono text-slate-700 font-black">{c.ruleId || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider block">IP Address</span>
                                  <span className="font-mono text-slate-700 font-black">{c.ipAddress || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider block">Reassign to FA?</span>
                                  <span className={cn(
                                    "font-sans font-bold uppercase text-[10px]",
                                    c.reassignedToFA && c.reassignedToFA !== 'No' ? "text-indigo-600" : "text-slate-500"
                                  )}>{c.reassignedToFA === 'Yes' ? 'Escalated to FA' : c.reassignedToFA || 'Local Agent only'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider block">Policy Action</span>
                                  <span className="font-mono text-slate-700 font-bold uppercase">{c.policyAction || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Remarks / Comments Section - cols: 7 */}
                            <div className="lg:col-span-7 space-y-4">
                              <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  Operator remarks & Custom Comments
                                </h4>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-xl p-4 min-h-[145px] shadow-sm max-h-[220px] overflow-y-auto space-y-3">
                                {c.remarks ? (
                                  c.remarks.split('\n\n').filter(Boolean).map((block, i) => (
                                    <div key={i} className="text-xs text-slate-700 border-l-4 border-indigo-400 pl-3 py-1 bg-slate-50/50 rounded-r-lg">
                                      <p className="whitespace-pre-line leading-relaxed font-sans">{block}</p>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-8">
                                    <p className="text-gray-400 italic text-xs uppercase tracking-widest font-bold">
                                      No remarks recorded
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1">Use the case manager to input update notes for this CIF number.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
