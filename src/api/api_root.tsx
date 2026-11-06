// The observers row the www3 userinfo service returns.
export interface UserInfo {
    status: string;
    Id: number;
    Title: string;
    FirstName: string;
    MiddleName: string;
    LastName: string;
    Email: string;
    Affiliation: string;
    WorkArea: string;
    Interests: string;
    Street: string;
    City: string;
    State: string;
    Country: string;
    Zip: string;
    Phone: string;
    Fax: string;
    URL: string;
    ModDate: string;
    Exposed: string;
    username: string;
    resetcode: number;
    AllocInst: string;
    BadEmail: string;
    Category: string;
}

export interface ScheduleItem {
    SchedId: number;
    Date: string;
    StartTime: string;
    EndTime: string;
    Instrument: string;
    Account: string;
    ProjCode: string;
    Institution: string;
    Principal: string;
    Observers: string;
    Location: string;
    Obsid: string;
    Length: number;
    FractionOfNight: number;
    Semester: string;
    TelNr?: string;
}

export interface SchedImg {
    file: string;
    TelNr?: string;
    img: string; // base64 png
}

export interface InstrumentStatus {
    Instrument: string;
    Available?: number;
    Date?: string;
    Location?: string;
    Scheduled?: number;
    Status?: string;
    TelNr?: number;
    TooReady?: boolean;
}

export interface InstrumentStatusResponse {
    [key: string]: InstrumentStatus;
}

export type ActionType = 'draft' | 'submit' | 'edit' | 'created';
export type InterruptType = 'partner' | 'institution';

// A ToO program allocation (too/getToo).
export interface TooItem {
    FirstName: string;
    LastName: string;
    HoursChargedInstitution: number;
    HoursChargedPartner: number;
    HoursRemainInstitution: number;
    HoursRemainPartner: number;
    InstrumentList: string;
    InterruptList: string;
    ObsId: string;
    ProjCode: string;
    Semester: string;
    tooHoursInstitution: number;
    tooHoursPartner: number;
}

// A ToO request (too/getTooRequests, too/submitTooRequest).
export interface Too {
    submitterid: string;
    username: string;
    action: ActionType;
    tooid?: string;
    delFlag: boolean
    semester: string;
    piid: string;
    projcode: string;
    instrument: string;
    obsdate: string;
    starttime: string;
    duration: string;
    target: string;
    flextime: string;
    obsdesignation?: string;
    obslocation: string;
    pinotes?: string;
    interruptproj: string;
    interrupttype: InterruptType;
    skipsubmitwarnings?: number;
    instrconfigs?: object[];
    reqstatus?: string;
    starlist?: string;
}

export interface SubmitTooResponse {
    status: string; // 'success' on success
    message?: string;
    tooid?: string;
    reqstatus?: string;
}

export interface TooCancelResponse {
    status: string; // 'success' on success
    message?: string;
}

export interface InterruptProgram {
    Date: string;
    EndTime: string;
    InstitutionInterrupt: boolean;
    InstitutionReason: string[]
    Instrument: string;
    IsSwitch: boolean;
    PartnerInterrupt: boolean
    PartnerReason: string[]
    ProjCode: string;
    StartTime: string;
}

export interface TooInterruptResult {
    checkTimeHST: string
    InstrReadyWarn: boolean
    InstrState: string
    TelReayWarn: boolean
    TelState: string
    canInterrupt: boolean;
    error: boolean | string;
    programs: InterruptProgram[];
}

export interface TooCanInterruptParams {
    semid: string;
    obsid: string;
    instr: string;
    date: string;
    duration: string;
    starttime: string;
}

export interface PlanningToolTarget {
    target_name: string;
    ra_deg?: number;
    dec_deg?: number;
    epoch?: number;
    equinox?: number;
    comment?: string;
    pm_ra?: number;
    pm_dec?: number;
    obsid?: number;
    _id?: string;
}

// ---------- Helpers ----------

// Carries the HTTP status (and parsed error body, if any) so callers can react to specific failures.
export class ApiError extends Error {
    status: number
    payload: unknown

    constructor(status: number, message: string, payload?: unknown) {
        super(message)
        this.status = status
        this.payload = payload
    }
}

const request = async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(url, init)
    if (!res.ok) {
        if (res.status === 401) console.error('Authentication error', url)
        else if (res.status === 404) console.error('404 error. API not found', url)
        const payload = await res.json().catch(() => null)
        throw new ApiError(res.status, `Request failed with status ${res.status} ${res.statusText}`, payload)
    }
    return res.json() as Promise<T>
}

const get = <T,>(url: string, init?: RequestInit) => request<T>(url, { method: 'GET', ...init })

const post = <T,>(url: string, body: unknown, init?: RequestInit) => request<T>(url, {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    body: JSON.stringify(body),
})

// ---------- Keck userinfo ----------

// The logged in observer; the login cookie identifies the user.
export const get_userinfo = () => get<UserInfo>(`/userinfo/`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
})

// ---------- Schedule ----------

export const get_schedule = async (date: string, telnr: string): Promise<ScheduleItem[]> => {
    const sched = await get<ScheduleItem[]>(`/api/schedule/getSchedule?date=${date}&telnr=${telnr}`)
    return sched.map(item => ({ ...item, TelNr: telnr }))
}

export const get_schedule_image = async (date: string, telnr: string): Promise<SchedImg> => {
    const img = await get<SchedImg>(`/api/schedule/getScheduleImage?date=${date}&telnr=${telnr}`)
    return { ...img, TelNr: telnr }
}

// Instruments with a null Instrument field are dropped.
export const get_instruments_too_status = async (date: string): Promise<InstrumentStatusResponse> => {
    const status = await get<InstrumentStatusResponse>(`/api/too/getInstrumentsTooStatus?date=${date}`)
    return Object.fromEntries(Object.entries(status).filter(([_, s]) => s.Instrument !== null))
}

// ---------- ToO ----------

export const get_too_items = (semester: string, obsid: string) =>
    get<TooItem[]>(`/api/too/getToo?semester=${semester}&obsid=${obsid}`)

// The API returns upper/mixed case keys; callers normalize them.
export const get_too_requests = (semester: string, obsid: string) =>
    get<unknown>(`/api/too/getTooRequests?semester=${semester}&obsid=${obsid}`)

export const submit_too_request = (too: Too) =>
    post<SubmitTooResponse>(`/api/too/submitTooRequest`, too)

export const delete_too_request = (tooid: string) =>
    request<unknown>(`/api/too/deleteTooRequest?tooid=${tooid}`, { method: 'DELETE' })

export const submit_too_cancel = (tooid: string, approvalnotes: string) =>
    post<TooCancelResponse>(`/api/too/submitTooCancel`, { tooid, approvalnotes })

export const get_too_can_interrupt = (params: TooCanInterruptParams) => {
    const query = new URLSearchParams({ ...params }).toString()
    return get<TooInterruptResult>(`/api/too/getTooCanInterrupt?${query}`)
}