/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Search, 
  RefreshCcw, 
  AlertCircle,
  CheckCircle2,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { parseFMSPastedData, formatCurrency } from '../lib/utils';
import { 
  FMS_STATUS_OPTIONS, 
  CALL_RESPONSE_OPTIONS, 
  RESOLUTION_OPTIONS, 
  REMARK_TEMPLATES 
} from '../constants';
import { CallResponse, FMSStatusAction, Resolution } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const formSchema = z.object({
  userId: z.string().min(1, 'CIF/User ID is required'),
  caseCreatedTime: z.string().min(1),
  caseAssignedTime: z.string().min(1),
  mode: z.string(),
  status: z.string(),
  eventType: z.string(),
  riskScore: z.number(),
  ipAddress: z.string(),
  ruleId: z.string(),
  policyAction: z.string(),
  assignedTo: z.string(),
  amount: z.number().min(0, 'Amount must be positive'),
  resolution: z.nativeEnum(Resolution).or(z.literal('')),
  firstCallTime: z.string().optional(),
  reassignedToFA: z.string().optional(),
  secondCallTime: z.string().optional(),
  thirdCallTime: z.string().optional(),
  callResponse: z.nativeEnum(CallResponse).or(z.literal('')),
  remarks: z.string(),
  fmsStatusAction: z.nativeEnum(FMSStatusAction).or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface CaseFormProps {
  initialMode: 'create' | 'update';
}

export default function CaseForm({ initialMode }: CaseFormProps) {
  const { profile } = useAuth();
  const [pasteData, setPasteData] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: '',
      caseCreatedTime: '',
      caseAssignedTime: '',
      mode: '',
      status: '',
      eventType: '',
      riskScore: 0,
      ipAddress: '',
      ruleId: '',
      policyAction: '',
      assignedTo: '',
      amount: 0,
      resolution: '',
      firstCallTime: '',
      reassignedToFA: '',
      secondCallTime: '',
      thirdCallTime: '',
      callResponse: '',
      remarks: '',
      fmsStatusAction: '',
    },
  });

  const handlePaste = () => {
    const parsed = parseFMSPastedData(pasteData);
    if (parsed) {
      setEditingId(null);
      form.reset();
      Object.entries(parsed).forEach(([key, value]) => {
        form.setValue(key as any, value);
      });
      setSuccess('Data parsed successfully! Form populated.');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError('Could not parse pasted data. Ensure it has the correct columns.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSearch = async () => {
    const cif = form.getValues('userId');
    if (!cif) return;

    setSearchLoading(true);
    try {
      const data = await api.get(`/api/cases/search?cif=${cif}`);
      
      if (data) {
        setEditingId(data.id);
        Object.entries(data).forEach(([key, value]) => {
          form.setValue(key as any, value);
        });
        setSuccess('Existing case found and loaded.');
      } else {
        setEditingId(null);
        setError('No existing case found for this CIF.');
        form.reset({ userId: cif });
      }
    } catch (err) {
      console.error(err);
      setError('Search failed.');
    } finally {
      setSearchLoading(false);
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const isUpdate = initialMode === 'update';
      const dataToSave = {
        ...values,
        id: isUpdate ? undefined : (editingId || undefined) // Force new row insertion under update mode
      };

      await api.post('/api/cases', dataToSave);
      setSuccess(isUpdate ? 'Subsequent call logged as a new database entry!' : 'Case saved successfully!');
      
      form.reset();
      setPasteData('');
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save case.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const insertTemplate = (template: string) => {
    const timestamp = new Date().toLocaleString('en-GB', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
    const finalRemark = template.replace('[TIMESTAMP]', timestamp);
    const currentRemarks = form.getValues('remarks');
    form.setValue('remarks', currentRemarks ? `${currentRemarks}\n\n${finalRemark}` : finalRemark);
  };

  return (
    <div className="w-full">
      {/* Main Single Column: Form Input */}
      <div className="flex flex-col gap-6">
        <div className="minimal-card flex flex-col min-h-[600px]">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50/50">
            <h2 className="font-bold text-xs text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <FileText size={16} className="text-brand" />
              {initialMode === 'create' ? 'Batch Data Ingestion' : 'CIF Record Update'}
              {editingId ? (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black border border-amber-200">UPDATE</span>
              ) : (
                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black border border-emerald-200">NEW</span>
              )}
            </h2>
          </div>

          <div className="flex-1 p-6 space-y-6">
            {initialMode === 'create' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <label className="label-minimal">Paste FMS Row (Auto-Parse)</label>
                <div className="relative">
                  <textarea
                    className="w-full h-24 p-3 bg-gray-50 border border-dashed border-gray-300 rounded text-xs font-mono resize-none focus:outline-none focus:border-brand transition-all"
                    placeholder="Paste FMS columns raw data here..."
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                  />
                  <button
                    onClick={handlePaste}
                    className="absolute bottom-3 right-3 px-3 py-1.5 bg-brand text-white text-[10px] font-bold rounded shadow-lg shadow-blue-100 hover:bg-blue-700 uppercase tracking-widest"
                  >
                    Parse Data
                  </button>
                </div>
              </motion.div>
            )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label-minimal">CIF Number / User ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-minimal font-bold"
                    placeholder="Enter CIF..."
                    {...form.register('userId')}
                  />
                  {initialMode === 'update' && (
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={searchLoading}
                      className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50"
                    >
                      {searchLoading ? <RefreshCcw size={16} className="animate-spin" /> : <Search size={16} />}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="label-minimal">Amount (RM)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-minimal font-bold text-brand"
                  {...form.register('amount', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Ingested FMS System Metadata Grid */}
            <div className="bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200 mt-4 space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">FMS Metadata Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label-minimal text-[10px]">Event Type</label>
                  <input type="text" className="input-minimal text-xs bg-white" {...form.register('eventType')} />
                </div>
                <div>
                  <label className="label-minimal text-[10px]">Risk Score</label>
                  <input type="number" className="input-minimal text-xs bg-white font-bold" {...form.register('riskScore', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label-minimal text-[10px]">IP Address</label>
                  <input type="text" className="input-minimal text-xs bg-white" {...form.register('ipAddress')} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label-minimal text-[10px]">Rule ID</label>
                  <input type="text" className="input-minimal text-xs bg-white font-mono" {...form.register('ruleId')} />
                </div>
                <div>
                  <label className="label-minimal text-[10px]">Policy Action</label>
                  <input type="text" className="input-minimal text-xs bg-white" {...form.register('policyAction')} />
                </div>
                <div>
                  <label className="label-minimal text-[10px]">Assigned FMS Officer</label>
                  <input type="text" className="input-minimal text-xs bg-white" {...form.register('assignedTo')} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-minimal text-[10px]">Case Created Time</label>
                  <input type="text" className="input-minimal text-xs bg-white font-mono" {...form.register('caseCreatedTime')} />
                </div>
                <div>
                  <label className="label-minimal text-[10px]">Case Assigned Time</label>
                  <input type="text" className="input-minimal text-xs bg-white font-mono" {...form.register('caseAssignedTime')} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label-minimal">FMS Status Action</label>
                <select className="input-minimal text-xs font-medium" {...form.register('fmsStatusAction')}>
                  <option value="">Select Action...</option>
                  {FMS_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="label-minimal">Call Response</label>
                <select className="input-minimal text-xs font-medium" {...form.register('callResponse')}>
                  <option value="">Select Response...</option>
                  {CALL_RESPONSE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                <label className="label-minimal">Resolution Status</label>
                <select className="input-minimal text-xs font-bold" {...form.register('resolution')}>
                  <option value="">Pending Resolution...</option>
                  {RESOLUTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="label-minimal">Templates</label>
                <select 
                  className="input-minimal text-xs"
                  onChange={(e) => insertTemplate(e.target.value)}
                >
                  <option value="">Select template...</option>
                  {REMARK_TEMPLATES.map((tmpl, idx) => (
                    <option key={idx} value={tmpl}>{tmpl.substring(0, 50)}...</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Verification Time Logs */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Call Verification log times (24-hour Shift Shortcuts)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label-minimal flex justify-between items-center bg-gray-50/50 px-2 py-0.5 rounded border border-gray-100">
                    <span>First Call Time</span>
                    <button
                      type="button"
                      onClick={() => {
                        form.setValue('firstCallTime', new Date().toLocaleString('en-GB', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit', hour12: true 
                        }));
                      }}
                      className="text-[9px] font-bold text-indigo-600 hover:underline uppercase tracking-widest"
                    >
                      Set Current Time
                    </button>
                  </label>
                  <input
                    type="text"
                    className="input-minimal text-xs font-mono"
                    placeholder="e.g. 11/06/2026, 05:30 PM"
                    {...form.register('firstCallTime')}
                  />
                </div>

                <div>
                  <label className="label-minimal">Reassigned to FA</label>
                  <select className="input-minimal text-xs" {...form.register('reassignedToFA')}>
                    <option value="">No / Local Agent Only</option>
                    <option value="Yes">Yes (Reassigned to Fraud Analyst)</option>
                    <option value="Specialist">Specialist Team Escalation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label-minimal flex justify-between items-center bg-gray-50/50 px-2 py-0.5 rounded border border-gray-100">
                    <span>Second Call Time</span>
                    <button
                      type="button"
                      onClick={() => {
                        form.setValue('secondCallTime', new Date().toLocaleString('en-GB', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit', hour12: true 
                        }));
                      }}
                      className="text-[9px] font-bold text-indigo-600 hover:underline uppercase tracking-widest"
                    >
                      Set Current Time
                    </button>
                  </label>
                  <input
                    type="text"
                    className="input-minimal text-xs font-mono"
                    placeholder="e.g. 11/06/2026, 06:15 PM"
                    {...form.register('secondCallTime')}
                  />
                </div>

                <div>
                  <label className="label-minimal flex justify-between items-center bg-gray-50/50 px-2 py-0.5 rounded border border-gray-100">
                    <span>Third Call Time</span>
                    <button
                      type="button"
                      onClick={() => {
                        form.setValue('thirdCallTime', new Date().toLocaleString('en-GB', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit', hour12: true 
                        }));
                      }}
                      className="text-[9px] font-bold text-indigo-600 hover:underline uppercase tracking-widest"
                    >
                      Set Current Time
                    </button>
                  </label>
                  <input
                    type="text"
                    className="input-minimal text-xs font-mono"
                    placeholder="e.g. 11/06/2026, 07:00 PM"
                    {...form.register('thirdCallTime')}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label-minimal">Remarks</label>
              <textarea
                className="input-minimal h-32 resize-none text-[12px] leading-relaxed"
                placeholder="Detailed verification notes..."
                {...form.register('remarks')}
              />
            </div>

            <AnimatePresence mode="wait">
              {(success || error) && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }}
                  className={cn(
                    "p-4 rounded-lg text-sm font-medium flex items-center gap-3 border",
                    success ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
                  )}
                >
                  {success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {success || error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="px-6 py-4 bg-gray-50/50 border-t border-border flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => { form.reset(); setEditingId(null); }}
              className="px-6 py-2 bg-white border border-border text-gray-500 rounded text-[11px] font-bold hover:bg-gray-50 transition-colors uppercase tracking-widest"
            >
              Reset
            </button>
            <button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={loading}
              className="px-8 py-2 bg-brand text-white rounded text-[11px] font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              {loading ? 'Processing...' : editingId ? 'Update Record' : 'Commit Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
