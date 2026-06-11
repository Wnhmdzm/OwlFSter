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

  // Check if we have multiple lines
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  // If there are multiple lines (at least 5), let's map index 4 (5th line) to CIF/userId
  if (lines.length >= 5) {
    return {
      caseCreatedTime: lines[0] || '',
      caseAssignedTime: lines[1] || '',
      mode: lines[2] || '',
      status: lines[3] || '',
      userId: lines[4] || '', // 5th line is CIF
      eventType: lines[5] || '',
      riskScore: parseInt(lines[6]?.replace(/[^0-9]/g, '') || '0'),
      ipAddress: lines[7] || '',
      ruleId: lines[8] || '',
      policyAction: lines[9] || '',
      assignedTo: lines[10] || '',
    };
  }

  // Try splitting by tabs first (Excel style)
  let parts = trimmed.split('\t');
  
  // If only 1 part, try splitting by double spaces or other common delimiters
  if (parts.length < 11) {
    // Regex for multiple spaces or tabs
    parts = trimmed.split(/\s{2,}/);
  }
  
  if (parts.length >= 11) {
    return {
      caseCreatedTime: parts[0]?.trim() || '',
      caseAssignedTime: parts[1]?.trim() || '',
      userId: parts[2]?.trim() || '',
      mode: parts[3]?.trim() || '',
      status: parts[4]?.trim() || '',
      eventType: parts[5]?.trim() || '',
      riskScore: parseInt(parts[6]?.trim().replace(/[^0-9]/g, '') || '0'),
      ipAddress: parts[7]?.trim() || '',
      ruleId: parts[8]?.trim() || '',
      policyAction: parts[9]?.trim() || '',
      assignedTo: parts[10]?.trim() || '',
    };
  }

  // Fallback for short multi-line pastes
  if (lines.length > 0) {
    return {
      caseCreatedTime: '',
      caseAssignedTime: '',
      userId: lines[Math.min(4, lines.length - 1)] || '',
      mode: '',
      status: '',
      eventType: '',
      riskScore: 0,
      ipAddress: '',
      ruleId: '',
      policyAction: '',
      assignedTo: '',
    };
  }

  return null;
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
