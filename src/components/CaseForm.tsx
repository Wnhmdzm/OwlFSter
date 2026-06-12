/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Search, 
  RefreshCcw, 
  AlertCircle,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  Clock,
  PhoneCall,
  Activity,
  DollarSign,
  ChevronRight,
  ClipboardCheck,
  ExternalLink
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { parseFMSPastedData, formatCurrency, formatFMSDate } from '../lib/utils';
import { FMS_STATUS_OPTIONS } from '../constants';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const formSchema = z.object({
  userId: z.string().min(1, 'CIF/User ID is required'),
  caseCreatedTime: z.string(),
  caseAssignedTime: z.string(),
  mode: z.string(),
  status: z.string(),
  eventType: z.string(),
  riskScore: z.any(),
  ipAddress: z.string(),
  ruleId: z.string(),
  policyAction: z.string(),
  assignedTo: z.string(),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  resolution: z.string(),
  firstCallTime: z.string(),
  reassignedToFA: z.string(),
  secondCallTime: z.string(),
  thirdCallTime: z.string(),
  callResponse: z.string(),
  remarks: z.string(),
  fmsStatusAction: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface CaseFormProps {
  initialMode: 'create' | 'update';
}

const PRESET_CONDITIONS = [
  {
    id: 'pt-1',
    label: 'Assume Genuine (Manual) - Close Screen Verification',
    callResponse: 'Close Screen Verification',
    resolution: 'Assume Genuine - Manual',
    template: 'Account reviewed, no susp activity seen, assume genuine, checks done.',
    colorBg: 'bg-emerald-50 border-emerald-200 text-emerald-800'
  },
  {
    id: 'pt-2',
    label: 'Assume Genuine (CC) - Close Screen Verification',
    callResponse: 'Close Screen Verification',
    resolution: 'Assume Genuine - CC',
    template: 'Customer contacted CC to unlock FMS within 30 minutes.',
    colorBg: 'bg-teal-50 border-teal-200 text-teal-800'
  },
  {
    id: 'pt-3',
    label: 'In Progress - Unable to Contact',
    callResponse: 'Unable to Contact',
    resolution: 'In Progress',
    template: 'Call Attempt Notes - Normal Called on [TIMESTAMP] but voicemail and inactive RIB locked. If customer calls in, kindly verify and confirm the red flag activity before unlocking.',
    colorBg: 'bg-orange-50 border-orange-200 text-orange-850'
  },
  {
    id: 'pt-4',
    label: 'Suspected Fraud - Unable to Contact',
    callResponse: 'Unable to Contact',
    resolution: 'Suspected Fraud',
    template: 'Called on [TIMESTAMP] but voicemail. RIB locked. If customer calls in, kindly advise customer visit branch to preform biometric verification.',
    colorBg: 'bg-red-50 border-red-150 text-red-850'
  },
  {
    id: 'pt-5',
    label: 'Confirmed Genuine - Contacted',
    callResponse: 'Contacted',
    resolution: 'Confirmed Genuine',
    template: 'Customer contacted [TIMESTAMP] and confirmed log in to RIB and performed transfer with verify 2+1.',
    colorBg: 'bg-indigo-50 border-indigo-200 text-indigo-850'
  },
  {
    id: 'pt-6',
    label: 'Suspected Fraud - Contacted',
    callResponse: 'Contacted',
    resolution: 'Suspected Fraud',
    template: 'Customer contacted [TIMESTAMP] and advised to visit the branch for biometric verification. RIB locked.',
    colorBg: 'bg-rose-50 border-rose-250 text-rose-850'
  }
];

export default function CaseForm({ initialMode }: CaseFormProps) {
  const { profile } = useAuth();
  const [pasteData, setPasteData] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // States for individual calls Remarks side-by-side
  const [call1Notes, setCall1Notes] = useState('');
  const [call2Notes, setCall2Notes] = useState('');
  const [call3Notes, setCall3Notes] = useState('');

  // States for visual feedback inside elements
  const [copiedCif, setCopiedCif] = useState(false);
  const [copiedRemarks, setCopiedRemarks] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
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

  const watchValues = form.watch();

  const resetFormToDefaults = () => {
    const fmsOfficer = profile?.uid || 'PS101435';
    const currentTimeStr = formatFMSDate(new Date());
    form.reset({
      userId: '',
      caseCreatedTime: '',
      caseAssignedTime: currentTimeStr,
      mode: '',
      status: '',
      eventType: '',
      riskScore: 0,
      ipAddress: '',
      ruleId: '',
      policyAction: '',
      assignedTo: fmsOfficer,
      amount: 0,
      resolution: '',
      firstCallTime: '',
      reassignedToFA: '',
      secondCallTime: '',
      thirdCallTime: '',
      callResponse: '',
      remarks: '',
      fmsStatusAction: '',
    });
    setCall1Notes('');
    setCall2Notes('');
    setCall3Notes('');
    setPasteData('');
  };

  useEffect(() => {
    resetFormToDefaults();
  }, [profile]);

  // Combine and format the individual call entries into the main remarks live
  useEffect(() => {
    let parts: string[] = [];
    const t1 = form.getValues('firstCallTime');
    const t2 = form.getValues('secondCallTime');
    const t3 = form.getValues('thirdCallTime');

    if (t1 || call1Notes) {
      parts.push(`[1st Call - ${t1 || 'PENDING'}]: ${call1Notes || 'No notes'}`);
    }
    if (t2 || call2Notes) {
      parts.push(`[2nd Call - ${t2 || 'PENDING'}]: ${call2Notes || 'No notes'}`);
    }
    if (t3 || call3Notes) {
      parts.push(`[3rd Call - ${t3 || 'PENDING'}]: ${call3Notes || 'No notes'}`);
    }

    if (parts.length > 0) {
      form.setValue('remarks', parts.join('\n\n'));
    }
  }, [watchValues.firstCallTime, watchValues.secondCallTime, watchValues.thirdCallTime, call1Notes, call2Notes, call3Notes]);

  const handlePaste = () => {
    const parsed = parseFMSPastedData(pasteData);
    if (parsed) {
      setEditingId(null);
      const currentTimeStr = formatFMSDate(new Date());
      const fmsOfficer = profile?.uid || 'PS101435';
      form.reset({
        userId: '',
        caseCreatedTime: '',
        mode: '',
        status: '',
        eventType: '',
        riskScore: 0,
        ipAddress: '',
        ruleId: '',
        policyAction: '',
        amount: 0,
        resolution: '',
        firstCallTime: '',
        reassignedToFA: '',
        secondCallTime: '',
        thirdCallTime: '',
        callResponse: '',
        remarks: '',
        fmsStatusAction: '',
        ...parsed,
        caseAssignedTime: currentTimeStr,
        assignedTo: fmsOfficer
      });
      setCall1Notes('');
      setCall2Notes('');
      setCall3Notes('');
      setSuccess('Data parsed successfully! Middle pane populated.');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError('Could not parse pasted data. Verify your paste contents.');
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

        // Initialize Call notes by parsing the loaded remarks blocks if possible
        const rawRem = data.remarks || '';
        const blocks = rawRem.split('\n\n').filter(Boolean);
        if (blocks.length > 0) {
          setCall1Notes(blocks[0].replace(/^\[1st Call - .*?\]:\s*/i, ''));
        } else {
          setCall1Notes('');
        }
        if (blocks.length > 1) {
          setCall2Notes(blocks[1].replace(/^\[2nd Call - .*?\]:\s*/i, ''));
        } else {
          setCall2Notes('');
        }
        if (blocks.length > 2) {
          setCall3Notes(blocks[2].replace(/^\[3rd Call - .*?\]:\s*/i, ''));
        } else {
          setCall3Notes('');
        }

        setSuccess('Existing case found and loaded.');
      } else {
        setEditingId(null);
        setError('No existing case found for this CIF.');
        form.reset({ userId: cif });
        setCall1Notes('');
        setCall2Notes('');
        setCall3Notes('');
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

  const formatTimestampNow = () => {
    return new Date().toLocaleString('en-GB', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  const handleApplyPreset = (presetId: string) => {
    if (!presetId) return;
    const preset = PRESET_CONDITIONS.find(p => p.id === presetId);
    if (!preset) return;

    // Apply values to the form
    form.setValue('callResponse', preset.callResponse);
    form.setValue('resolution', preset.resolution);

    const stamp = formatTimestampNow();
    const evaluatedTemplate = preset.template
      .replace(/\[TIMESTAMP\]/g, stamp)
      .replace(/\[timestamp\]/g, stamp);

    // Populate call 1 notes & timestamp
    form.setValue('firstCallTime', stamp);
    setCall1Notes(evaluatedTemplate);
    
    // Set remarks explicitly
    form.setValue('remarks', `[1st Call - ${stamp}]: ${evaluatedTemplate}`);
  };

  const handleCopyCif = () => {
    const cifVal = watchValues.userId;
    if (!cifVal) return;
    navigator.clipboard.writeText(cifVal);
    setCopiedCif(true);
    setTimeout(() => setCopiedCif(false), 2000);
  };

  const handleCopyRemarks = () => {
    const remarksVal = watchValues.remarks;
    if (!remarksVal) return;
    navigator.clipboard.writeText(remarksVal);
    setCopiedRemarks(true);
    setTimeout(() => setCopiedRemarks(false), 2000);
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
      
      resetFormToDefaults();
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save case.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div className="w-full h-full max-h-[640px]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[500px]">
        
        {/* Left Column: Data Ingestion (col-span-3) */}
        <div className="lg:col-span-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2">
              <FileText className="text-indigo-600" size={15} />
              <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">Raw Ingestion</h3>
            </div>
            
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Paste the complete row copy-pasted directly from your FMS dashboard to parse instantly.
            </p>

            <textarea
              className="w-full h-44 p-2 bg-slate-50 hover:bg-slate-50/70 border border-dashed border-slate-300 rounded-lg text-[11px] font-mono resize-none focus:outline-none focus:border-indigo-500 transition-all select-all font-semibold leading-relaxed"
              placeholder="Paste FMS raw data rows/columns here..."
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={handlePaste}
              disabled={!pasteData.trim()}
              className="w-full py-2 bg-neutral-900 border border-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-40"
            >
              Parse Raw Data
            </button>
            <button
              type="button"
              onClick={() => setPasteData('')}
              className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
            >
              Clear Raw Pane
            </button>
          </div>
        </div>

        {/* Middle Column: Automatic Populated Metadata Pane (col-span-4) */}
        <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2">
              <Activity className="text-indigo-600" size={15} />
              <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">System Metadata</h3>
            </div>

            {/* Editable Fields: CIF and Amount */}
            <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-100">
              {/* CIF with custom click to copy */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  CIF Number / USER ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full pl-2 pr-8 py-1.5 bg-indigo-50/50 border border-indigo-200 focus:border-indigo-500 text-xs font-black text-slate-900 rounded-lg outline-none transition-all placeholder:text-slate-400"
                    placeholder="Enter CIF..."
                    {...form.register('userId')}
                  />
                  {watchValues.userId && (
                    <button
                      type="button"
                      onClick={handleCopyCif}
                      title="Click to copy CIF"
                      className="absolute right-1 text-indigo-600 hover:text-indigo-850 top-1.5 p-1 rounded transition-colors"
                    >
                      {copiedCif ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} />}
                    </button>
                  )}
                </div>
                {initialMode === 'update' && (
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searchLoading || !watchValues.userId}
                    className="mt-1 width-full text-[9px] font-extrabold text-indigo-700 hover:underline uppercase tracking-wide flex items-center gap-0.5"
                  >
                    {searchLoading ? <RefreshCcw size={10} className="animate-spin" /> : <Search size={10} />}
                    Search Database
                  </button>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Amount (RM)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-2 text-slate-400" size={11} />
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-6 pr-2 py-1.5 bg-indigo-50/35 border border-indigo-100 focus:border-indigo-500 text-xs font-black text-slate-900 rounded-lg outline-none transition-all"
                    {...form.register('amount', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Read-only beautiful table grid for automated fields */}
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Parsed FMS Fields (Read Only)</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] font-semibold text-slate-700 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Event Type</span>
                  <span className="font-bold block truncate">{watchValues.eventType || '-'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Risk Score</span>
                  <span className="font-extrabold text-red-600 block">{watchValues.riskScore || '-'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Mode / Channel</span>
                  <span className="font-mono text-[10px] block truncate">{watchValues.mode || '-'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Rule ID</span>
                  <span className="font-mono text-[10px] text-slate-650 block truncate">{watchValues.ruleId || '-'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">FMS Case Status</span>
                  <span className="font-bold text-slate-800 block truncate">{watchValues.status || '-'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Assigned Officer</span>
                  <span className="font-mono text-[10px] block truncate">{watchValues.assignedTo || '-'}</span>
                </div>
                <div className="col-span-2 border-t border-slate-200/60 pt-1.5 mt-1 space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Policy Action</span>
                  <span className="block font-bold truncate text-slate-800">{watchValues.policyAction || '-'}</span>
                </div>
                <div className="col-span-2 space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Case Created Time</span>
                  <span className="font-mono text-[10px] text-slate-650 block">{watchValues.caseCreatedTime || '-'}</span>
                </div>
                <div className="col-span-2 space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Case Assigned Time</span>
                  <span className="font-mono text-[10px] text-slate-650 block">{watchValues.caseAssignedTime || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-extrabold uppercase">
            <span>INGESTION STATUS:</span>
            {watchValues.userId ? (
              <span className="text-emerald-600 flex items-center gap-0.5 font-black">
                <Check size={11} /> READY TO VERIFY
              </span>
            ) : (
              <span className="text-slate-400 animate-pulse font-medium">WAITING FOR CIF RAW CELLS</span>
            )}
          </div>
        </div>

        {/* Right Column: Resolution Area & Call Logs (col-span-5) */}
        <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-2">
              <div className="flex items-center gap-1.5">
                <PhoneCall className="text-indigo-600" size={15} />
                <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">Verification Workflow</h3>
              </div>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">Compact View</span>
            </div>

            {/* Presets dropdown */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                FMS Call & Resolution Presets
              </label>
              <select
                onChange={(e) => {
                  handleApplyPreset(e.target.value);
                  // Reset select back to empty
                  e.target.value = "";
                }}
                className="w-full px-2.5 py-1.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-400 text-xs font-black text-slate-800 rounded-lg outline-none cursor-pointer transition-all"
              >
                <option value="" className="font-semibold text-slate-400">Select Preset (populates Response, Status, Remarks)...</option>
                {PRESET_CONDITIONS.map(p => (
                  <option key={p.id} value={p.id} className="font-bold text-slate-900">
                    {p.callResponse} → [{p.resolution}]
                  </option>
                ))}
              </select>
            </div>

            {/* Active Dropdowns for Manual Corrections */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-2 border border-slate-100 rounded-xl">
              <div>
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Call Response</span>
                <input 
                  type="text" 
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 font-extrabold"
                  {...form.register('callResponse')}
                />
              </div>
              <div>
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Resolution</span>
                <input 
                  type="text" 
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 font-extrabold"
                  {...form.register('resolution')}
                />
              </div>
            </div>

            {/* Calls Timestamp / Remarks side-by-side tables */}
            <div className="space-y-2 pt-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Call attempt history logs</span>
              
              <div className="space-y-1.5">
                {/* 1st Call */}
                <div className="grid grid-cols-12 gap-1.5 items-center bg-slate-50/40 p-1 rounded-lg border border-slate-100">
                  <div className="col-span-5 relative">
                    <span className="absolute left-1.5 top-1.5 text-[8.5px] font-bold text-slate-400 tracking-wider">1st:</span>
                    <input
                      type="text"
                      className="w-full pl-6 pr-6 py-1 bg-white border border-slate-200 rounded text-[10.5px] font-mono text-slate-700 outline-none"
                      placeholder="Timestamp (automatic)"
                      {...form.register('firstCallTime')}
                    />
                    <button
                      type="button"
                      onClick={() => form.setValue('firstCallTime', formatTimestampNow())}
                      className="absolute right-1.5 top-1.5 text-indigo-500 hover:text-indigo-850 active:scale-90 transition-transform"
                      title="Set Now"
                    >
                      <Clock size={11} className="stroke-[2.5px]" />
                    </button>
                  </div>
                  <div className="col-span-7">
                    <input
                      type="text"
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10.5px] text-slate-800 font-medium placeholder:text-slate-350"
                      placeholder="1st attempt specific notes..."
                      value={call1Notes}
                      onChange={(e) => setCall1Notes(e.target.value)}
                    />
                  </div>
                </div>

                {/* 2nd Call */}
                <div className="grid grid-cols-12 gap-1.5 items-center bg-slate-50/40 p-1 rounded-lg border border-slate-100">
                  <div className="col-span-5 relative">
                    <span className="absolute left-1.5 top-1.5 text-[8.5px] font-bold text-slate-400 tracking-wider">2nd:</span>
                    <input
                      type="text"
                      className="w-full pl-7 pr-6 py-1 bg-white border border-slate-200 rounded text-[10.5px] font-mono text-slate-705 outline-none"
                      placeholder="Timestamp"
                      {...form.register('secondCallTime')}
                    />
                    <button
                      type="button"
                      onClick={() => form.setValue('secondCallTime', formatTimestampNow())}
                      className="absolute right-1.5 top-1.5 text-indigo-500 hover:text-indigo-850 active:scale-90 transition-transform"
                      title="Set Now"
                    >
                      <Clock size={11} className="stroke-[2.5px]" />
                    </button>
                  </div>
                  <div className="col-span-7">
                    <input
                      type="text"
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10.5px] text-slate-800 font-medium placeholder:text-slate-350"
                      placeholder="2nd attempt specific notes..."
                      value={call2Notes}
                      onChange={(e) => setCall2Notes(e.target.value)}
                    />
                  </div>
                </div>

                {/* 3rd Call */}
                <div className="grid grid-cols-12 gap-1.5 items-center bg-slate-50/40 p-1 rounded-lg border border-slate-100">
                  <div className="col-span-5 relative">
                    <span className="absolute left-1.5 top-1.5 text-[8.5px] font-bold text-slate-400 tracking-wider">3rd:</span>
                    <input
                      type="text"
                      className="w-full pl-7 pr-6 py-1 bg-white border border-slate-200 rounded text-[10.5px] font-mono text-slate-705 outline-none"
                      placeholder="Timestamp"
                      {...form.register('thirdCallTime')}
                    />
                    <button
                      type="button"
                      onClick={() => form.setValue('thirdCallTime', formatTimestampNow())}
                      className="absolute right-1.5 top-1.5 text-indigo-500 hover:text-indigo-850 active:scale-90 transition-transform"
                      title="Set Now"
                    >
                      <Clock size={11} className="stroke-[2.5px]" />
                    </button>
                  </div>
                  <div className="col-span-7">
                    <input
                      type="text"
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10.5px] text-slate-800 font-medium placeholder:text-slate-350"
                      placeholder="3rd attempt specific notes..."
                      value={call3Notes}
                      onChange={(e) => setCall3Notes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FMS Status Action & Reassignment team Escalation */}
            <div className="grid grid-cols-2 gap-3 pt-0.5">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                  FMS Status Action
                </span>
                <select className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs font-black rounded-lg outline-none cursor-pointer" {...form.register('fmsStatusAction')}>
                  <option value="">No status change...</option>
                  {FMS_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                  Escalate Team
                </span>
                <select className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs font-black rounded-lg outline-none cursor-pointer" {...form.register('reassignedToFA')}>
                  <option value="">No / Local Agent Only</option>
                  <option value="Yes">Yes (Fraud Analyst)</option>
                  <option value="Specialist">Escalated Specialist Team</option>
                </select>
              </div>
            </div>

            {/* Main remarks area */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                  Compiled Audit Remarks
                </label>
                {watchValues.remarks && (
                  <button
                    type="button"
                    onClick={handleCopyRemarks}
                    className="text-[9px] text-indigo-600 hover:text-indigo-850 font-black uppercase flex items-center gap-0.5 cursor-pointer"
                  >
                    {copiedRemarks ? <ClipboardCheck size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    {copiedRemarks ? 'COPIED!' : 'Copy Remarks'}
                  </button>
                )}
              </div>
              <textarea
                className="w-full h-20 p-2 bg-slate-55 border border-slate-200 text-xs font-semibold rounded-xl resize-none focus:outline-none focus:border-indigo-500 transition-all text-slate-805 leading-relaxed placeholder:text-slate-350"
                placeholder="Detailed sequential logs list..."
                {...form.register('remarks')}
              />
            </div>

            {/* Error/success displays */}
            <AnimatePresence mode="wait">
              {(success || error) && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }}
                  className={cn(
                    "p-2.5 rounded-lg text-xs font-bold leading-tight flex items-center gap-2 border shadow-sm",
                    success ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
                  )}
                >
                  {success ? <CheckCircle2 size={13} className="shrink-0" /> : <AlertCircle size={13} className="shrink-0" />}
                  <span className="truncate">{success || error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action buttons footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={resetFormToDefaults}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
            >
              Reset UI
            </button>
            <button
              type="submit"
              onClick={form.handleSubmit(onSubmit as any)}
              disabled={loading || !watchValues.userId}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-150 transition-all disabled:opacity-40 cursor-pointer"
            >
              {loading ? 'Processing...' : editingId ? 'Update Case Record' : 'Commit Case Entry'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
