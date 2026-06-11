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
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="text-brand" size={24} />
          Search Financial Institution
        </h2>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
          Identify Malaysian saving/current bank accounts with instant regex rule mapping
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input box */}
        <div className="lg:col-span-4 space-y-6">
          <div className="minimal-card p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} className="text-brand animate-pulse" />
              Ingestion Terminal
            </h3>

            <div>
              <label className="label-minimal">Paste Account / Raw Copy Text</label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste the bank account number or copy-pasted sheet cells here..."
                className="w-full h-36 p-3 bg-gray-50 border border-slate-200 rounded text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-all"
                id="bank_pasted_data_input"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClassify}
                disabled={isClassifying || !pasteText.trim()}
                className="flex-1 py-2.5 bg-brand text-white text-[11px] font-black uppercase tracking-widest rounded shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                id="analyze_bank_bttn"
              >
                {isClassifying ? (
                  <RefreshCw className="animate-spin inline mr-1" size={12} />
                ) : (
                  <Search className="inline mr-1" size={12} />
                )}
                Analyze Account
              </button>
              
              <button
                type="button"
                onClick={() => { setPasteText(''); setResults([]); setError(null); }}
                className="px-4 py-2.5 bg-white border border-border text-gray-500 text-[11px] font-bold rounded uppercase tracking-widest hover:bg-gray-50"
              >
                Reset
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded text-xs text-red-700 font-medium flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="minimal-card p-6 space-y-4">
            <h3 className="label-minimal">Operational Tips</h3>
            <div className="space-y-3">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Our database checks lengths from 10 to 16 digits and cross-references them with specific regional routing flags of major Malaysian institutions.
              </p>
              <div className="pt-2 border-t border-gray-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Try these sample mock numbers:</span>
                <div className="flex flex-col gap-1.5 mt-2">
                  <button 
                    onClick={() => handleQuickPasteExample("Affin Account Transfer: 100123456789")}
                    className="text-left text-[11px] text-indigo-600 hover:underline font-mono truncate"
                  >
                    Affin Bank (12-digit: 100...)
                  </button>
                  <button 
                    onClick={() => handleQuickPasteExample("Transfer to Maybank saving 164212345678")}
                    className="text-left text-[11px] text-indigo-600 hover:underline font-mono truncate"
                  >
                    Maybank (12-digit: 164...)
                  </button>
                  <button 
                    onClick={() => handleQuickPasteExample("CIMB Core account: 70451234567890")}
                    className="text-left text-[11px] text-indigo-600 hover:underline font-mono truncate"
                  >
                    CIMB (14-digit: 704...)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Output list of matched banks */}
        <div className="lg:col-span-8 space-y-4">
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
                  {/* Account detail line */}
                  <div className="px-6 py-4 bg-slate-50 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-slate-500" />
                      <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Pasted Target:</span>
                      <span className="font-mono text-sm font-black text-slate-900 tracking-tight">{res.accountNo}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                        {res.accountNo.length} Digits
                      </span>
                    </div>
                  </div>

                  {/* Matching results */}
                  <div className="p-6 space-y-4">
                    {res.matches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {res.matches.map((match, bnkIdx) => (
                          <div 
                            key={match.bank.shortName}
                            className={`p-4 border rounded-xl flex flex-col justify-between transition-all bg-white hover:shadow-md ${
                              bnkIdx === 0 ? "border-brand ring-1 ring-brand/30" : "border-slate-200"
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-gradient-to-r ${match.bank.color}`}>
                                  {match.bank.shortName}
                                </span>
                                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
                                  {match.score}% match
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-slate-800 leading-tight mb-1">{match.bank.name}</h4>
                              <p className="text-[10px] text-gray-500 leading-normal mb-3">{match.bank.description}</p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-slate-400">
                                {match.isExactLength ? (
                                  <span className="text-emerald-500">✓ Length OK</span>
                                ) : (
                                  <span className="text-slate-400">✗ Length Diff</span>
                                )}
                                <span>•</span>
                                {match.isPrefixMatch ? (
                                  <span className="text-emerald-500">✓ Prefix OK</span>
                                ) : (
                                  <span className="text-slate-400">✗ Prefix Diff</span>
                                )}
                              </div>
                              
                              <button
                                onClick={() => handleCopy(res.accountNo, match.bank.name, accIdx, bnkIdx)}
                                className="px-2.5 py-1 bg-gray-50 hover:bg-brand hover:text-white rounded text-[10px] font-bold text-slate-600 transition-all border border-slate-200"
                              >
                                {copiedIndex?.accIndex === accIdx && copiedIndex?.bankIndex === bnkIdx ? (
                                  <span className="flex items-center gap-1 text-[9px]">
                                    <ClipboardCheck size={11} /> COPIED
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Copy size={11} /> Copy
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                        <HelpCircle className="mx-auto text-slate-300" size={32} />
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">No definite bank match</h4>
                        <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                          The account number does not perfectly align with any common Malaysian bank sequences. Double check the input digits.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="minimal-card p-12 text-center space-y-4 flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center shadow-inner">
                  <Building2 size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-widest">Waiting for Account Input</h4>
                  <p className="text-xs text-slate-400 max-w-md">
                    Paste a saving or current account number into the left terminal to identify which Malaysian Financial Institution it belongs to.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="text-[9px] uppercase font-black tracking-widest text-indigo-500 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full animate-pulse">
                    RULE-ENGINE ST_BANK_V1.0
                  </span>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
