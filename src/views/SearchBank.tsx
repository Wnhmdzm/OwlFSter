/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  HelpCircle, 
  ClipboardCheck, 
  Copy, 
  AlertCircle, 
  CreditCard,
  Search,
  RefreshCw,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface BankRule {
  name: string;
  shortName: string;
  lengths: number[];
  prefixes: string[];
  color: string;
  description: string;
  example: string;
}

const MALAYSIAN_BANKS: BankRule[] = [
  {
    name: "Malayan Banking Berhad (Maybank)",
    shortName: "Maybank",
    lengths: [12, 10],
    prefixes: ["11", "15", "16", "51", "56", "512", "514", "114", "162", "164"],
    color: "from-yellow-400 to-amber-500 text-slate-900 border-amber-300",
    description: "Malaysia's largest financial services group. Typically 12 digits (starting with 1, 5, or 11/51/56 ranges).",
    example: "164212345678"
  },
  {
    name: "CIMB Bank Berhad",
    shortName: "CIMB",
    lengths: [14, 10, 11],
    prefixes: ["70", "76", "80", "86", "20", "22"],
    color: "from-red-600 to-rose-700 text-white border-red-400",
    description: "Commonly 14 digits. Features unique series starting with 70, 76, 80, or 86.",
    example: "70451234567890"
  },
  {
    name: "Public Bank Berhad",
    shortName: "Public Bank",
    lengths: [10],
    prefixes: ["3", "4", "6", "31", "39", "40", "60"],
    color: "from-red-700 via-rose-800 to-red-950 text-white border-red-500",
    description: "Standard accounts use exactly 10 digits starting with 3, 4, or 6.",
    example: "3199123456"
  },
  {
    name: "RHB Bank Berhad",
    shortName: "RHB Bank",
    lengths: [14, 10],
    prefixes: ["10", "20", "21", "101", "202", "212", "214"],
    color: "from-blue-600 to-indigo-700 text-white border-blue-400",
    description: "Typically uses 14 digits (sometimes 10) beginning with 1 or 2 series.",
    example: "21211234567890"
  },
  {
    name: "Affin Bank Berhad",
    shortName: "Affin Bank",
    lengths: [10, 12],
    prefixes: ["10", "50", "100", "101", "105", "106", "505"],
    color: "from-sky-500 to-blue-600 text-white border-sky-300",
    description: "Affin Bank savings & current accounts are typically 10 or 12 digits.",
    example: "100123456789"
  },
  {
    name: "Alliance Bank Malaysia Berhad",
    shortName: "Alliance Bank",
    lengths: [15, 10],
    prefixes: ["12", "14", "0", "1"],
    color: "from-emerald-600 to-teal-700 text-white border-emerald-400",
    description: "Alliance Bank features 15-digit or 10-digit formats.",
    example: "120112345678901"
  },
  {
    name: "AmBank (M) Berhad",
    shortName: "AmBank",
    lengths: [13, 11],
    prefixes: ["0", "2", "8", "88", "001", "012", "211", "888"],
    color: "from-orange-500 to-red-600 text-white border-orange-400",
    description: "Generally has 13 digits starting with 0, 2, or 8 (especially 888 series).",
    example: "8881123456789"
  },
  {
    name: "Hong Leong Bank Berhad",
    shortName: "Hong Leong",
    lengths: [11],
    prefixes: ["0", "1", "2", "3", "001", "101", "190", "280", "328"],
    color: "from-blue-800 to-slate-900 text-white border-blue-500",
    description: "Maintains a standard 11-digit structure across savings and current accounts.",
    example: "10121234567"
  },
  {
    name: "Bank Simpanan Nasional (BSN)",
    shortName: "BSN",
    lengths: [11, 16],
    prefixes: ["01", "14", "10", "010", "141", "101"],
    color: "from-teal-500 to-emerald-600 text-white border-teal-300",
    description: "Exactly 11 or 16 digits (giro/savings accounts).",
    example: "14112123456"
  },
  {
    name: "Bank Islam Malaysia Berhad",
    shortName: "Bank Islam",
    lengths: [14],
    prefixes: ["12", "14", "120", "140"],
    color: "from-emerald-800 to-teal-900 text-white border-emerald-600",
    description: "Standard 14 digits starting with 12 or 14.",
    example: "12012123456789"
  },
  {
    name: "Bank Rakyat",
    shortName: "Bank Rakyat",
    lengths: [11],
    prefixes: ["11", "22", "110", "220"],
    color: "from-blue-700 to-sky-800 text-white border-blue-500",
    description: "Typically 11 digits, with common sequences starting with 11 or 22.",
    example: "11002123456"
  },
  {
    name: "United Overseas Bank (UOB)",
    shortName: "UOB Bank",
    lengths: [11],
    prefixes: ["1", "2", "3", "111", "211", "311"],
    color: "from-blue-900 to-slate-900 text-white border-blue-700",
    description: "Standardized accounts contain exactly 11 digits.",
    example: "11121234567"
  },
  {
    name: "OCBC Bank (Malaysia) Berhad",
    shortName: "OCBC",
    lengths: [10],
    prefixes: ["1", "7", "101", "701"],
    color: "from-red-500 to-rose-600 text-white border-red-300",
    description: "Standard 10-digit savings/current accounts.",
    example: "1011123456"
  },
  {
    name: "Bank Muamalat Malaysia Berhad",
    shortName: "Bank Muamalat",
    lengths: [14],
    prefixes: ["14", "140"],
    color: "from-amber-600 to-orange-700 text-white border-amber-400",
    description: "Specifically 14 digits starting with 14 series.",
    example: "14011234567890"
  },
  {
    name: "HSBC Bank Malaysia Berhad",
    shortName: "HSBC",
    lengths: [12],
    prefixes: ["3", "4", "1", "302", "401"],
    color: "from-red-650 to-red-800 text-white border-red-400",
    description: "Standard accounts use exactly 12 digits.",
    example: "302212345678"
  },
  {
    name: "Standard Chartered Bank Malaysia",
    shortName: "Standard Chartered",
    lengths: [11],
    prefixes: ["3", "4", "301", "401"],
    color: "from-green-600 to-sky-600 text-white border-green-400",
    description: "Exactly 11 digits starting standard series.",
    example: "30111234567"
  }
];

interface ClassificationResult {
  accountNo: string;
  matches: {
    bank: BankRule;
    score: number; // 0-100 score of matching suitability
    isExactLength: boolean;
    isPrefixMatch: boolean;
  }[];
}

export default function SearchBank() {
  const [pasteText, setPasteText] = useState('');
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<{accIndex: number, bankIndex: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

  const cleanAndExtractAccounts = (text: string): string[] => {
    // Regex matches any contiguous string of digits between 10 and 16 characters
    const regex = /\b\d{10,16}\b/g;
    const found = text.match(regex) || [];
    // De-duplicate
    return Array.from(new Set(found));
  };

  const handleClassify = () => {
    setIsClassifying(true);
    setError(null);
    const accounts = cleanAndExtractAccounts(pasteText);

    if (accounts.length === 0) {
      // Check if they put any numbers at all
      const rawDigits = pasteText.replace(/\D/g, '');
      if (rawDigits.length >= 10 && rawDigits.length <= 16) {
        accounts.push(rawDigits);
      } else {
        setError("Could not extract any valid account number (10 to 16 digits long) from pasted text.");
        setIsClassifying(false);
        setResults([]);
        return;
      }
    }

    const classificationList: ClassificationResult[] = accounts.map(acc => {
      const matchCandidates = MALAYSIAN_BANKS.map(bank => {
        const isExactLength = bank.lengths.includes(acc.length);
        const prefixMatch = bank.prefixes.find(pre => acc.startsWith(pre));
        const isPrefixMatch = !!prefixMatch;

        let score = 0;
        if (isExactLength && isPrefixMatch) {
          score = 95 + (prefixMatch ? prefixMatch.length : 0); // Very high score
        } else if (isExactLength) {
          score = 60; // Length matches
        } else if (isPrefixMatch) {
          score = 40; // Only prefix matches
        }

        return {
          bank,
          score,
          isExactLength,
          isPrefixMatch
        };
      })
      .filter(candidate => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

      return {
        accountNo: acc,
        matches: matchCandidates
      };
    });

    setResults(classificationList);
    setIsClassifying(false);
  };

  const handleCopy = (account: string, bankName: string, accIndex: number, bankIndex: number) => {
    const textToCopy = `Account: ${account} | Bank: ${bankName}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex({ accIndex, bankIndex });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleQuickPasteExample = (ex: string) => {
    setPasteText(ex);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Search FI <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">Active</span>
            </h2>
            <p className="text-slate-500 text-xs">
              Instant Bank Account Categorizer & Regex Rule Mapper for Malaysian FIs.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-450 uppercase font-black border border-slate-200 px-3 py-1.5 rounded-xl bg-slate-50">
            Rules mapped: {MALAYSIAN_BANKS.length} FIs
          </span>
        </div>
      </div>

      {/* Input container ON TOP */}
      <div className="minimal-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={13} className="text-indigo-600 animate-pulse" />
              Ingestion Terminal & Quick Analysis
            </h3>
            <p className="text-slate-500 text-[11px]">Paste full cells, raw lines or plain account digits to run instant lookup.</p>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1 bg-slate-50 px-2 py-1 rounded">Quick Inputs:</span>
            <button 
              onClick={() => handleQuickPasteExample("164212345678")}
              className="px-2.5 py-1 text-[10px] font-mono text-indigo-600 hover:text-white bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:border-indigo-600 rounded-lg transition-all"
            >
              Maybank (164...)
            </button>
            <button 
              onClick={() => handleQuickPasteExample("70451234567890")}
              className="px-2.5 py-1 text-[10px] font-mono text-indigo-600 hover:text-white bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:border-indigo-600 rounded-lg transition-all"
            >
              CIMB (704...)
            </button>
            <button 
              onClick={() => handleQuickPasteExample("100123456789")}
              className="px-2.5 py-1 text-[10px] font-mono text-indigo-600 hover:text-white bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:border-indigo-600 rounded-lg transition-all"
            >
              Affin Bank (100...)
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleClassify();
            }}
            placeholder="Type or paste Malaysian bank account number here (e.g. 164212345678) and press Enter..."
            className="w-full pl-4 pr-32 py-4 bg-slate-50 hover:bg-slate-50/80 border border-slate-200 focus:border-indigo-500 text-sm font-semibold rounded-2xl outline-none transition-all shadow-inner"
            id="bank_pasted_data_input"
          />
          <div className="absolute right-2 top-2 flex items-center gap-1.5">
            {pasteText && (
              <button
                type="button"
                onClick={() => { setPasteText(''); setResults([]); setError(null); }}
                className="px-3 py-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleClassify}
              disabled={isClassifying || !pasteText.trim()}
              className="px-5 py-2.5 bg-neutral-900 border border-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg disabled:opacity-50"
              id="analyze_bank_bttn"
            >
              {isClassifying ? (
                <RefreshCw className="animate-spin" size={13} />
              ) : (
                <Search size={13} />
              )}
              Analyze
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Output results list */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {results.length > 0 ? (
            results.map((res, accIdx) => (
              <motion.div
                key={res.accountNo + accIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="minimal-card overflow-hidden"
              >
                {/* Account details top line */}
                <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Searched Target</span>
                        <span className="font-mono text-sm font-black text-slate-900 tracking-tight selection:bg-indigo-200">{res.accountNo}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Length: <strong className="text-slate-600 font-bold">{res.accountNo.length} Digits</strong> • Extracted via rule engine</p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(res.accountNo);
                        alert("Account number copied to clipboard!");
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                    >
                      <Copy size={11} /> Copy Raw Account
                    </button>
                  </div>
                </div>

                {/* Grid of matched Suggestion Cards */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matched Bank Recommendations</h4>
                    <span className="text-[10px] text-slate-500 font-semibold">{res.matches.length} matches found</span>
                  </div>

                  {res.matches.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {res.matches.map((match, bnkIdx) => (
                        <div 
                          key={match.bank.shortName}
                          className={`p-4 border rounded-2xl flex flex-col justify-between transition-all bg-white hover:border-indigo-500 hover:shadow-lg ${
                            bnkIdx === 0 ? "border-indigo-500 shadow-md ring-1 ring-indigo-500/15" : "border-slate-100"
                          }`}
                        >
                          <div>
                            {/* Matching Score percentage and Badge */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-gradient-to-r ${match.bank.color} shadow-sm`}>
                                {match.bank.shortName}
                              </span>
                              
                              {/* Percentage element */}
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "text-xs font-black",
                                  match.score >= 90 ? "text-emerald-600" : match.score >= 50 ? "text-amber-600" : "text-slate-400"
                                )}>
                                  {match.score}% MATCH
                                </span>
                              </div>
                            </div>

                            {/* FI full name and info */}
                            <h5 className="text-xs font-bold text-slate-800 leading-tight mb-1">{match.bank.name}</h5>
                            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{match.bank.description}</p>
                          </div>

                          {/* Matching factors and copy block */}
                          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">Match precision:</span>
                              <div className="flex gap-1.5">
                                <span className={cn("px-1 rounded text-[9px] font-extrabold", match.isExactLength ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400")}>
                                  {match.isExactLength ? 'Length ✓' : 'Length ✗'}
                                </span>
                                <span className={cn("px-1 rounded text-[9px] font-extrabold", match.isPrefixMatch ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400")}>
                                  {match.isPrefixMatch ? 'Prefix ✓' : 'Prefix ✗'}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleCopy(res.accountNo, match.bank.name, accIdx, bnkIdx)}
                              className="mt-2 w-full py-2 bg-slate-50 hover:bg-indigo-650 hover:text-white rounded-xl text-xs font-bold text-slate-700 transition-all border border-slate-200 hover:border-indigo-600 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              {copiedIndex?.accIndex === accIdx && copiedIndex?.bankIndex === bnkIdx ? (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold">
                                  <ClipboardCheck size={12} /> COPIED DETAILS
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Copy size={12} /> Copy Combined details
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center border border-dashed border-slate-100 rounded-2xl max-w-sm mx-auto space-y-3">
                      <HelpCircle className="mx-auto text-slate-300" size={32} />
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">No Bank Matches Found</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Account number does not align with predefined rules for Malaysian financial institutions. Please review digits.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="minimal-card p-12 text-center space-y-4 flex flex-col items-center justify-center min-h-[350px]">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shadow-inner animate-bounce">
                <Building2 size={28} />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-widest">Waiting for Search Term</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Enter bank account digits in the search box above to evaluate routing rules with visual percentage breakdowns.
                </p>
              </div>
              <div className="pt-2">
                <span className="text-[9px] uppercase font-black tracking-widest text-indigo-500 bg-indigo-50 border border-indigo-100 px-3/5 py-1.5 rounded-full">
                  Instant Match Engine ACTIVE
                </span>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
