/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallResponse, FMSStatusAction, Resolution } from "./types";

export const REMARK_TEMPLATES = [
  "Hvt Voicemail",
  "Normal Called on [TIMESTAMP] but voicemail and inactive RIB locked. If customer calls in, kindly verify and confirm the red flag activity before unlocking.",
  "Customer contacted [TIMESTAMP] and confirmed log in to RIB and performed transfer with verify 2+1.",
  "Customer contacted [TIMESTAMP] and advised to visit the branch for biometric verification. RIB locked.",
  "Customer contacted Contact Centre, and the FMS was unlocked by CC on [TIMESTAMP]",
  "Called on [TIMESTAMP] but voicemail. RIB locked. If customer calls in, kindly advise customer visit branch to preform biometric verification.",
  "Customer contacted CC to unlock FMS within 30 minutes.",
  "Account reviewed, no susp activity seen, assume genuine, checks done."
];

export const FMS_STATUS_OPTIONS = Object.values(FMSStatusAction);
export const CALL_RESPONSE_OPTIONS = Object.values(CallResponse);
export const RESOLUTION_OPTIONS = Object.values(Resolution);

export const PASTED_DATA_HEADERS = [
  "Date & Time Case Created (in FMS)",
  "Date & Time Case Assigned (in FMS)",
  "User ID",
  "Mode",
  "Status",
  "Event Type",
  "Risk Score",
  "IP Address & IP Country",
  "Rule ID",
  "Policy Action",
  "Assigned To"
];
