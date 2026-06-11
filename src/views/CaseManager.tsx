/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import CaseForm from '../components/CaseForm';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export default function CaseManager() {
  const [activeTab, setActiveTab] = useState<'create' | 'update'>('create');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Tab selectors for Case: Create Case vs Update Case */}
      <div className="flex border-b border-border bg-white p-1 rounded-xl shadow-sm gap-2">
        <button
          onClick={() => setActiveTab('create')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
            activeTab === 'create' 
              ? "bg-brand text-white shadow-lg shadow-blue-100" 
              : "text-slate-400 hover:text-brand hover:bg-slate-50"
          )}
          id="tab_create_case"
        >
          <PlusCircle size={14} />
          Create Case
        </button>
        <button
          onClick={() => setActiveTab('update')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
            activeTab === 'update' 
              ? "bg-brand text-white shadow-lg shadow-blue-100" 
              : "text-slate-400 hover:text-brand hover:bg-slate-50"
          )}
          id="tab_update_case"
        >
          <RefreshCw size={14} />
          Update Case
        </button>
      </div>

      {activeTab === 'create' ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">New Case Entry</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Batch process or manual command entry</p>
          </div>
          <CaseForm initialMode="create" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Update Record</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Historical audit lookup and modification</p>
          </div>
          <CaseForm initialMode="update" />
        </div>
      )}
    </div>
  );
}
