/**
 * 94 Shared Web APIs — Mobile cross-reference list
 * APIs shared between Web and Mobile app (no `/mobile` in path).
 * When backend changes any of these, Mobile team must be notified.
 * Source: Jira TVT-2632
 */

export interface SharedApi {
    name: string;
    method: string;
    endpoint: string;
    module: string;
}

export const SHARED_APIS: SharedApi[] = [
    // Auth — 4 APIs
    { name: "login", method: "POST", endpoint: "/corehr/api/v1/auth/login", module: "Auth" },
    { name: "refreshToken", method: "POST", endpoint: "/corehr/api/v1/auth/refresh-token", module: "Auth" },
    { name: "forgotPassword", method: "POST", endpoint: "/corehr/api/v1/auth/forgot-password", module: "Auth" },
    { name: "logout", method: "GET", endpoint: "/corehr/api/v1/auth/logout", module: "Auth" },

    // CoreHR — 16 APIs
    { name: "getPasswordControl", method: "GET", endpoint: "/corehr/api/v1/password-controls", module: "CoreHR" },
    { name: "userInfo", method: "GET", endpoint: "/corehr/api/v1/user/info", module: "CoreHR" },
    { name: "changePassword", method: "PUT", endpoint: "/corehr/api/v1/user/passwords", module: "CoreHR" },
    { name: "passwordSetup", method: "PUT", endpoint: "/corehr/api/v1/user/passwords", module: "CoreHR" },
    { name: "getMyProfile", method: "GET", endpoint: "/corehr/api/v1/my-profile", module: "CoreHR" },
    { name: "getEmployeeImage", method: "GET", endpoint: "/corehr/api/v1/auth/images", module: "CoreHR" },
    { name: "getEmployeeData", method: "GET", endpoint: "/corehr/api/v1/employee-profiles/search", module: "CoreHR" },
    { name: "getEmployeeSubordinates", method: "GET", endpoint: "/corehr/api/v1/employee-profiles/subordinates", module: "CoreHR" },
    { name: "getEmployeeById", method: "GET", endpoint: "/corehr/api/v1/employee-profiles", module: "CoreHR" },
    { name: "getEmployeeProfileByEmployeeSystemNumber", method: "GET", endpoint: "/corehr/api/v1/employee-profiles/{employeeSystemNumber}", module: "CoreHR" },
    { name: "getApproverPage", method: "GET", endpoint: "/corehr/api/v1/approver-page", module: "CoreHR" },
    { name: "getApproverPageMobile", method: "GET", endpoint: "/corehr/api/v1/approver-page/mobile", module: "CoreHR" },
    { name: "postApproverPage", method: "POST", endpoint: "/corehr/api/v1/approver-page", module: "CoreHR" },
    { name: "getApproverPageDetail", method: "GET", endpoint: "/corehr/api/v1/approver-page/{approverPageId}", module: "CoreHR" },
    { name: "getApproverPageSearch", method: "GET", endpoint: "/corehr/api/v1/approver-page/search", module: "CoreHR" },
    { name: "getApproverPageRequesters", method: "GET", endpoint: "/corehr/api/v1/approver-page/requesters", module: "CoreHR" },

    // Time & Attendance — File (2)
    { name: "postUploadFile", method: "POST", endpoint: "/timeattendance/api/v1/files/upload", module: "T&A - File" },
    { name: "getDownloadFile", method: "GET", endpoint: "/timeattendance/api/v1/files/download/{fileName}", module: "T&A - File" },

    // Time & Attendance — Time Clock (11)
    { name: "clockIn", method: "POST", endpoint: "/timeattendance/api/v1/time-clocks/clock-in", module: "T&A - Time Clock" },
    { name: "clockOut", method: "POST", endpoint: "/timeattendance/api/v1/time-clocks/clock-out", module: "T&A - Time Clock" },
    { name: "breakIn", method: "POST", endpoint: "/timeattendance/api/v1/time-clocks/break-in", module: "T&A - Time Clock" },
    { name: "breakOut", method: "POST", endpoint: "/timeattendance/api/v1/time-clocks/break-out", module: "T&A - Time Clock" },
    { name: "postDailyTimeClock", method: "POST", endpoint: "/timeattendance/api/v1/time-clocks/daily", module: "T&A - Time Clock" },
    { name: "getDailyTimeClock", method: "GET", endpoint: "/timeattendance/api/v1/time-clocks/daily", module: "T&A - Time Clock" },
    { name: "getShiftData", method: "GET", endpoint: "/timeattendance/api/v1/time-clocks/shift", module: "T&A - Time Clock" },
    { name: "getHolidays", method: "GET", endpoint: "/timeattendance/api/v1/time-clocks/public-holidays", module: "T&A - Time Clock" },
    { name: "getHolidays2", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-calendar/public-holidays", module: "T&A - Time Clock" },
    { name: "timeClockReminder", method: "GET/POST", endpoint: "/timeattendance/api/v1/time-clocks/reminder", module: "T&A - Time Clock" },
    { name: "getAttendanceLocations", method: "GET", endpoint: "/timeattendance/api/v1/attendance-locations/google-map/geocode", module: "T&A - Time Clock" },

    // Time & Attendance — Attendance (2)
    { name: "getShiftActual", method: "GET", endpoint: "/timeattendance/api/v1/attendance/search-shift-actual", module: "T&A - Attendance" },
    { name: "getAttendanceVer2", method: "GET", endpoint: "/timeattendance/api/v1/attendance/search", module: "T&A - Attendance" },

    // Time & Attendance — Attendance Change Request (8)
    { name: "getAttendanceChangeRequest", method: "GET", endpoint: "/timeattendance/api/v1/attendance-data/search-request", module: "T&A - Attendance Change" },
    { name: "getAttendance", method: "GET", endpoint: "/timeattendance/api/v1/attendance-data/search-attendance", module: "T&A - Attendance Change" },
    { name: "getSubordinateAttendanceChangeRequest", method: "GET", endpoint: "/timeattendance/api/v1/attendance-data/get-subordinates", module: "T&A - Attendance Change" },
    { name: "postAttendanceChangeRequestSubmit", method: "POST", endpoint: "/timeattendance/api/v1/attendance-data/submit", module: "T&A - Attendance Change" },
    { name: "postAttendanceChangeRequestDraft", method: "POST", endpoint: "/timeattendance/api/v1/attendance-data/draft", module: "T&A - Attendance Change" },
    { name: "getAttendanceChangeRequestDetail", method: "GET", endpoint: "/timeattendance/api/v1/me/attendance-data/request-detail", module: "T&A - Attendance Change" },
    { name: "getAttendanceChangeRequestWorkflow", method: "GET", endpoint: "/timeattendance/api/v1/attendance-data/workflow-status", module: "T&A - Attendance Change" },
    { name: "postAttendanceChangeRequestSendReminder", method: "POST", endpoint: "/timeattendance/api/v1/me/attendance-data/send-reminder", module: "T&A - Attendance Change" },

    // Time & Attendance — Overtime (15)
    { name: "getAllOvertimeRequest", method: "GET", endpoint: "/timeattendance/api/v1/overtime-requests/search", module: "T&A - Overtime" },
    { name: "getSubordinateOvertimeRequest", method: "GET", endpoint: "/timeattendance/api/v1/overtime-requests/subordinates", module: "T&A - Overtime" },
    { name: "getOvertimeRequestType", method: "GET", endpoint: "/timeattendance/api/v1/overtime-requests/type-request", module: "T&A - Overtime" },
    { name: "getOvertimeType", method: "GET", endpoint: "/timeattendance/api/v1/me/overtime-requests/type-ot-request", module: "T&A - Overtime" },
    { name: "postOvertimeRequstSubmit", method: "POST", endpoint: "/timeattendance/api/v1/overtime-requests", module: "T&A - Overtime" },
    { name: "getMeOvertimeRequestDetail", method: "GET", endpoint: "/timeattendance/api/v1/me/overtime-requests/detail", module: "T&A - Overtime" },
    { name: "getOvertimeRequestDetail", method: "GET", endpoint: "/timeattendance/api/v1/overtime-requests/detail", module: "T&A - Overtime" },
    { name: "getOvertimeRequestSendReminderV2", method: "GET", endpoint: "/timeattendance/api/v1/me/overtime-requests/send-reminder", module: "T&A - Overtime" },
    { name: "getMeOvertimeRequestWithdraw", method: "GET", endpoint: "/timeattendance/api/v1/me/overtime-requests/withdraw", module: "T&A - Overtime" },
    { name: "getMeOvertimeRequest", method: "GET", endpoint: "/timeattendance/api/v1/me/overtime-requests/search", module: "T&A - Overtime" },
    { name: "postMeOvertimeRequest", method: "POST", endpoint: "/timeattendance/api/v1/me/overtime-requests", module: "T&A - Overtime" },
    { name: "putUpdateMeOvertimeRequest", method: "PUT", endpoint: "/timeattendance/api/v1/me/overtime-requests", module: "T&A - Overtime" },
    { name: "postOvertimeCalculateDuration", method: "POST", endpoint: "/timeattendance/api/v1/overtime-requests/calculation-duration", module: "T&A - Overtime" },
    { name: "getOvertimeRequestWorkflow", method: "GET", endpoint: "/timeattendance/api/v1/me/overtime-requests/workflow/{requestNo}", module: "T&A - Overtime" },
    { name: "getShiftActualOvertime", method: "GET", endpoint: "/timeattendance/api/v1/me/overtime-requests/search-shift-actual", module: "T&A - Overtime" },

    // Time & Attendance — Notification (5)
    { name: "getNotifications", method: "GET", endpoint: "/timeattendance/api/v1/notifications", module: "T&A - Notification" },
    { name: "getClearAllNotifications", method: "GET", endpoint: "/timeattendance/api/v1/notifications/clear-all", module: "T&A - Notification" },
    { name: "postNotificationMarkAsRead", method: "POST", endpoint: "/timeattendance/api/v1/notifications/mark-as-read", module: "T&A - Notification" },
    { name: "postNotificationMarkAsUnread", method: "POST", endpoint: "/timeattendance/api/v1/notifications/mark-as-unread", module: "T&A - Notification" },
    { name: "postNotificationMarkAllAsRead", method: "POST", endpoint: "/timeattendance/api/v1/notifications/mark-all-as-read", module: "T&A - Notification" },

    // Leave — Balance & General (5)
    { name: "getLeaveBalance", method: "GET", endpoint: "/timeattendance/api/v1/leave-balance/search", module: "Leave - Balance" },
    { name: "getSelfLeaveRequests", method: "GET", endpoint: "/timeattendance/api/v1/leave-requests/with-self", module: "Leave - Balance" },
    { name: "getMeLeaveRequests", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-requests", module: "Leave - Balance" },
    { name: "uploadLeaveRequestFiles", method: "POST", endpoint: "/timeattendance/api/v1/files/LEAVE_REQUEST", module: "Leave - Balance" },
    { name: "getAllRequest", method: "GET", endpoint: "/timeattendance/api/v1/me/all-requests", module: "Leave - Balance" },

    // Leave — Request V2 (8)
    { name: "getLeaveRequestTypes", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-requests/leave-types", module: "Leave - Request" },
    { name: "getAllLeaveTypes", method: "GET", endpoint: "/timeattendance/api/v1/leave-types/find", module: "Leave - Request" },
    { name: "postLeaveRequestSubmitV2", method: "POST", endpoint: "/timeattendance/api/v1/me/leave-requests/submit", module: "Leave - Request" },
    { name: "postLeaveRequestDraftV2", method: "POST", endpoint: "/timeattendance/api/v1/me/leave-requests/draft", module: "Leave - Request" },
    { name: "getLeaveRequestDetailv2", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-requests/detail/{requestNo}", module: "Leave - Request" },
    { name: "getLeaveRequestSendReminderV2", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-requests/send-reminder", module: "Leave - Request" },
    { name: "deleteDraft", method: "DELETE", endpoint: "/timeattendance/api/v1/me/leave-requests/{id}", module: "Leave - Request" },
    { name: "getLeaveRequestShiftSchedule", method: "GET", endpoint: "/timeattendance/api/v1/leave-requests/shift-schedule", module: "Leave - Request" },

    // Leave — Cancel (6)
    { name: "getCancelLeaveRequestDetail", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-requests/cancel-requests/cancel/{requestNo}", module: "Leave - Cancel" },
    { name: "postCancelLeaveRequest", method: "POST", endpoint: "/timeattendance/api/v1/me/leave-requests/cancel-requests/submit", module: "Leave - Cancel" },
    { name: "getCancelLeaveRequestList", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-requests/cancel-requests/list/{requestNo}", module: "Leave - Cancel" },
    { name: "getCancelLeaveRequestDetails", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-requests/cancel-requests/details", module: "Leave - Cancel" },
    { name: "getCancelLeaveRequestApprovalProcess", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-requests/steps", module: "Leave - Cancel" },
    { name: "getCancelLeaveRequest", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-requests/cancel-requests/cancel/{requestNo}", module: "Leave - Cancel" },

    // Leave — Calendar (5)
    { name: "getLeaveRequestByDateRange", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-requests", module: "Leave - Calendar" },
    { name: "getHasAnySubordinate", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-calendar/has-any-subordinate", module: "Leave - Calendar" },
    { name: "getLeaveCalendar", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-calendar", module: "Leave - Calendar" },
    { name: "getTeamLeaveCalendar", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-calendar/team-leave-calendar", module: "Leave - Calendar" },
    { name: "getTeamLeaveCalendarDetail", method: "GET", endpoint: "/timeattendance/api/v1/me/leave-calendar/team-leave-calendar/detail", module: "Leave - Calendar" },

    // Payroll — 7 APIs
    { name: "getPayslip", method: "GET", endpoint: "/payroll/api/v1/me/payslip", module: "Payroll" },
    { name: "getPcbII", method: "GET", endpoint: "/payroll/api/v1/me/pcb-ii", module: "Payroll" },
    { name: "getEaEc", method: "GET", endpoint: "/payroll/api/v1/me/eaec/search", module: "Payroll" },
    { name: "getPayrollDocuments", method: "GET", endpoint: "/payroll/api/v1/me/payroll-documents", module: "Payroll" },
    { name: "getFile", method: "GET", endpoint: "/payroll/api/v1/me/file", module: "Payroll" },
    { name: "getFile2", method: "GET", endpoint: "/payroll/api/v1/file/generate-url", module: "Payroll" },
    { name: "getFileTemporary", method: "GET", endpoint: "/payroll/api/v1/file", module: "Payroll" },
];

/**
 * Keywords for Jira-only analysis fallback.
 * When GitLab is unavailable, scan issue summaries for these keywords.
 */
export const API_KEYWORDS: Record<string, string[]> = {
    "CoreHR": ["employee-profile", "my-profile", "approver-page", "password", "user/info"],
    "T&A": ["time-clock", "clock-in", "clock-out", "attendance", "overtime", "notification", "shift", "holiday"],
    "Leave": ["leave-request", "leave-balance", "leave-calendar", "leave-type", "cancel.*leave"],
    "Payroll": ["payslip", "pcb", "eaec", "payroll-document"],
};

/**
 * Match diff content against the 94 shared APIs.
 * Extracts the path segment from each endpoint and checks if it appears in the diff text.
 */
export function matchEndpoints(diffContent: string): SharedApi[] {
    const matched = new Set<string>();
    const results: SharedApi[] = [];

    for (const api of SHARED_APIS) {
        // Remove path params like {employeeSystemNumber} for matching
        const cleanEndpoint = api.endpoint.replace(/\{[^}]+\}/g, "");
        // Get the most specific path segment (last 2 segments)
        const segments = cleanEndpoint.split("/").filter(Boolean);
        const searchKey = segments.slice(-2).join("/");

        if (diffContent.includes(searchKey) && !matched.has(api.endpoint)) {
            matched.add(api.endpoint);
            results.push(api);
        }
    }

    return results;
}

/**
 * Scan Jira issue text for API-related keywords (fallback when no GitLab).
 */
export function matchKeywords(text: string): string[] {
    const lowerText = text.toLowerCase();
    const matchedModules: string[] = [];

    for (const [module, keywords] of Object.entries(API_KEYWORDS)) {
        for (const keyword of keywords) {
            if (keyword.includes("*")) {
                const regex = new RegExp(keyword, "i");
                if (regex.test(lowerText)) {
                    matchedModules.push(module);
                    break;
                }
            } else if (lowerText.includes(keyword.toLowerCase())) {
                matchedModules.push(module);
                break;
            }
        }
    }

    return [...new Set(matchedModules)];
}
