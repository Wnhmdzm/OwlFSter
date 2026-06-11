/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseFMSPastedData(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const result: Record<string, any> = {
    caseCreatedTime: '',
    caseAssignedTime: '',
    userId: '',
    mode: 'PROD',
    status: 'IN_PROGRESS',
    eventType: 'PAYMENT',
    riskScore: 0,
    ipAddress: '',
    ruleId: '',
    policyAction: 'CHALLENGE',
    assignedTo: '',
    amount: 0
  };

  // 1. Try Key-Value line parsing first (e.g. "CIF: 220068280" format)
  let kvMatchedCount = 0;
  lines.forEach(line => {
    const separatorIdx = line.indexOf(':');
    if (separatorIdx === -1) return;

    const label = line.substring(0, separatorIdx).trim().toLowerCase();
    const value = line.substring(separatorIdx + 1).trim();
    if (!value) return;

    if (label.includes('cif') || label.includes('user id') || label.includes('customer id') || label.includes('userid') || label.includes('user & org')) {
      result.userId = value.split(/\s+/)[0]; // get the CIF part
      kvMatchedCount++;
    } else if (label.includes('created time') || label.includes('case created') || label.includes('creation time') || label.includes('date created')) {
      result.caseCreatedTime = value;
      kvMatchedCount++;
    } else if (label.includes('assigned time') || label.includes('case assigned') || label.includes('assignment time') || label.includes('date modified') || label.includes('modified')) {
      result.caseAssignedTime = value;
      kvMatchedCount++;
    } else if (label.includes('mode') || label.includes('channel')) {
      result.mode = value;
      kvMatchedCount++;
    } else if (label.includes('status')) {
      result.status = value;
      kvMatchedCount++;
    } else if (label.includes('event type') || label.includes('event')) {
      result.eventType = value;
      kvMatchedCount++;
    } else if (label.includes('risk score') || label.includes('score')) {
      result.riskScore = parseInt(value.replace(/[^0-9]/g, '') || '0');
      kvMatchedCount++;
    } else if (label.includes('ip address') || label.includes('ip details') || label.includes('ip')) {
      result.ipAddress = value.split(/\s+/)[0]; // get IP part
      kvMatchedCount++;
    } else if (label.includes('rule id') || label.includes('rule')) {
      result.ruleId = value;
      kvMatchedCount++;
    } else if (label.includes('policy action') || label.includes('policy')) {
      result.policyAction = value;
      kvMatchedCount++;
    } else if (label.includes('assigned to') || label.includes('officer') || label.includes('operator')) {
      result.assignedTo = value;
      kvMatchedCount++;
    } else if (label.includes('amount') || label.includes('value') || label.includes('rm')) {
      result.amount = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
      kvMatchedCount++;
    }
  });

  if (kvMatchedCount >= 3) {
    return result;
  }

  // 2. Clear out results to parse sequentially or token-by-token
  result.caseCreatedTime = '';
  result.caseAssignedTime = '';
  result.userId = '';

  // Classify tokens dynamically.
  // First, let's collect all possible chunks. Clean tabs, double spaces, and newlines.
  const chunks: string[] = [];
  lines.forEach(line => {
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes('  ')) {
      parts = line.split(/\s{2,}/);
    } else {
      parts = [line];
    }
    parts.forEach(p => {
      const pClean = p.trim();
      if (pClean) {
        chunks.push(pClean);
      }
    });
  });

  const dateTokens: string[] = [];
  const otherTokens: string[] = [];

  // Assemble wrapped dates (e.g. "Jun 10, 2026" + "11:09:10 AM" + "MYT")
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const lower = chunk.toLowerCase();
    
    const isMonth = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(lower);
    const isYear = /\b202\d\b/.test(lower);
    const isTime = /\b\d{1,2}:\d{2}(:\d{2})?\b/i.test(lower) || /am|pm/i.test(lower);
    const isMyt = lower === 'myt';

    if (isMonth || isYear || isTime || isMyt) {
      let combinedDate = chunk;
      let lookAhead = 1;
      while (i + lookAhead < chunks.length) {
        const nextChunk = chunks[i + lookAhead];
        const nextLower = nextChunk.toLowerCase();
        const nextMonth = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(nextLower);
        const nextYear = /\b202\d\b/.test(nextLower);
        const nextTime = /\b\d{1,2}:\d{2}(:\d{2})?\b/i.test(nextLower) || /am|pm/i.test(nextLower);
        const nextMyt = nextLower === 'myt';
        const nextDatePart = /^\d{1,2},?$/.test(nextLower);

        if (nextMonth || nextYear || nextTime || nextMyt || nextDatePart) {
          combinedDate += ' ' + nextChunk;
          lookAhead++;
        } else {
          break;
        }
      }
      dateTokens.push(combinedDate.trim().replace(/\s+/g, ' '));
      i += (lookAhead - 1); 
    } else {
      otherTokens.push(chunk);
    }
  }

  // Populate Dates
  if (dateTokens.length > 0) {
    result.caseCreatedTime = dateTokens[0];
    if (dateTokens[1]) {
      result.caseAssignedTime = dateTokens[1];
    }
  }

  // Classify other tokens
  otherTokens.forEach((token) => {
    const lower = token.toLowerCase();

    // IP Address
    const ipMatch = token.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    if (ipMatch) {
      result.ipAddress = ipMatch[0];
      return;
    }

    // Mode
    const modeWords = ['prod', 'mobile', 'web', 'api', 'dev', 'uat'];
    if (modeWords.some(w => lower === w)) {
      result.mode = token.toUpperCase();
      return;
    }

    // Status
    const statusWords = ['in_progress', 'pending', 'completed', 'verified', 'closed', 'new', 'escalated'];
    if (statusWords.some(w => lower === w || lower.startsWith(w) || lower.endsWith(w))) {
      result.status = token.toUpperCase();
      return;
    }

    // Event Type
    const eventWords = ['payment', 'transfer', 'login', 'signup', 'registration', 'purchase'];
    if (eventWords.some(w => lower === w)) {
      result.eventType = token.toUpperCase();
      return;
    }

    // Policy Action
    const policyWords = ['challenge', 'allow', 'deny', 'block', 'alert', 'review'];
    if (policyWords.some(w => lower === w || lower.startsWith(w) || lower.endsWith(w))) {
      result.policyAction = token.toUpperCase();
      return;
    }

    // Risk Score
    if (/^\d{1,3}$/.test(token)) {
      const val = parseInt(token);
      if (val >= 0 && val <= 1000 && !result.riskScore) {
        result.riskScore = val;
        return;
      }
    }

    // CIF / User ID sequence (usually 7-15 digits)
    if (/^\d{6,20}$/.test(token.split(/[\s\n]+/)[0])) {
      result.userId = token.split(/[\s\n]+/)[0];
      return;
    }
  });

  // Force CIF/UserID match from lines[4] (the 5th line) if result.userId is still empty
  if (!result.userId && lines.length >= 5) {
    const potentialCif = lines[4].split(/[\s\n]+/)[0].trim();
    if (potentialCif && potentialCif.length >= 4) {
      result.userId = potentialCif;
    }
  }

  // Also, scan lines for "AFFIN" or similar banks/corporate tags next to CIF
  if (!result.userId) {
    const idxWithAffin = lines.findIndex(l => l.toUpperCase().includes('AFFIN'));
    if (idxWithAffin !== -1) {
      const match = lines[idxWithAffin].match(/\b\d{6,15}\b/);
      if (match) {
        result.userId = match[0];
      } else {
        if (lines[idxWithAffin - 1] && /^\d{6,15}$/.test(lines[idxWithAffin - 1])) {
          result.userId = lines[idxWithAffin - 1];
        } else if (lines[idxWithAffin + 1] && /^\d{6,15}$/.test(lines[idxWithAffin + 1])) {
          result.userId = lines[idxWithAffin + 1];
        }
      }
    }
  }

  // Deduce Rule ID
  chunks.forEach(chunk => {
    const lower = chunk.toLowerCase();
    if (lower.includes('take over') || lower.includes('rule') || lower.includes('ato') || lower.includes('velocity') || lower.includes('suspicious')) {
      result.ruleId = chunk;
    }
  });

  if (!result.ruleId) {
    const ruleCandidate = chunks.find(chunk => {
      const lower = chunk.toLowerCase();
      const isDate = dateTokens.some(d => d.includes(chunk));
      const pClean = chunk.split(/\s+/)[0];
      const isIp = pClean.includes('.') || /^\d{1,3}\.\d{1,3}/.test(pClean);
      const isShort = chunk.length < 5;
      const isKnown = ['prod', 'in_progress', 'payment', 'challenge', 'allow', 'deny', 'block', 'alert', 'review'].includes(lower);
      return !isDate && !isIp && !isShort && !isKnown && chunk !== result.userId;
    });
    if (ruleCandidate) {
      result.ruleId = ruleCandidate;
    }
  }

  return result;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2
  }).format(value);
}

export function formatDate(date: Date | null) {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
}

export function formatFMSDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = months[date.getMonth()];
  const d = date.getDate();
  const y = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // midnight/noon hour 0 should be 12
  const h = String(hours).padStart(2, '0');
  
  return `${m} ${d}, ${y} ${h}:${minutes}:${seconds} ${ampm} MYT`;
}

export function parseCustomDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const cleaned = dateStr.trim();
  if (!cleaned) return null;

  // Remove " MYT" or other timezone code at the end
  let temp = cleaned.replace(/\s*[A-Z]{3,4}$/i, '');

  // Check if it's DD/MM/YYYY Style (e.g. "11/06/2026, 07:42 PM" or "11/06/2026, 19:42")
  const ddmmyyyyMatch = temp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (ddmmyyyyMatch) {
    const [_, day, month, year, hourStr, minStr, secStr, ampm] = ddmmyyyyMatch;
    let hours = parseInt(hourStr);
    const minutes = parseInt(minStr);
    const seconds = secStr ? parseInt(secStr) : 0;
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, minutes, seconds);
  }

  const parsed = new Date(temp);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

export function getTurnaroundTime(caseAssignedTime: string, firstCallTime?: string): string {
  const start = parseCustomDate(caseAssignedTime);
  const end = firstCallTime ? parseCustomDate(firstCallTime) : null;
  
  if (!start) return '-';
  
  const endTime = end ? end.getTime() : Date.now();
  const diffMs = endTime - start.getTime();
  
  if (diffMs <= 0) {
    return '0h 0m';
  }
  
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}h ${minutes}m`;
}
