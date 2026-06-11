/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export enum FMSStatusAction {
  LOCKED = 'Locked',
  NOT_LOCKED = 'Not Locked',
  UNLOCK = 'Unlock',
  LOCKOUT = 'Lockout'
}

export enum CallResponse {
  CONTACTED = 'Contacted',
  UNABLE_TO_CONTACT = 'Unable to contact',
  ASSUME_GENUINE = 'Assume Genuine'
}

export enum Resolution {
  CONFIRM_FRAUD = 'Confirm Fraud',
  SUSPECTED_FRAUD = 'Suspected Fraud',
  CONFIRM_GENUINE = 'Confirm Genuine',
  ASSUME_GENUINE = 'Assume Genuine'
}

export interface FMSCase {
  id: string; // Internal Firebase ID
  // Pasted Fields
  caseCreatedTime: string;
  caseAssignedTime: string;
  userId: string; // CIF
  mode: string;
  status: string;
  eventType: string;
  riskScore: number;
  ipAddress: string;
  ruleId: string;
  policyAction: string;
  assignedTo: string;
  
  // Manual Input Fields
  amount: number;
  resolution: Resolution | '';
  firstCallTime?: string;
  reassignedToFA?: string;
  secondCallTime?: string;
  thirdCallTime?: string;
  callResponse: CallResponse | '';
  remarks: string;
  fmsStatusAction: FMSStatusAction | '';
  
  // Metadata
  createdByUid: string;
  createdByName: string;
  createdAt: any; // Firestore serverTimestamp
  updatedAtAt: any; // Firestore serverTimestamp
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
}
