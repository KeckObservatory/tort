import { Tooltip, TextField, Stack, Box, Typography, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import { StyledPaper } from './App';
import { useEffect, useState } from 'react';
import { BASE_TOO } from './config';
import { DayjsDatePicker } from './schedule_panel';
import { delete_too_request, get_too_items, get_too_requests, submit_too_cancel, submit_too_request, type ActionType, type InstrumentStatusResponse, type InterruptType, type ScheduleItem, type TooWindow, type Too, type TooItem } from './api/api_root';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimeField } from '@mui/x-date-pickers/TimeField';
import dayjs from 'dayjs';
import { TooInterruptDialogButton } from './too_interrupt_dialog';

interface StartTimePickerProps {
    time: string;
    date: dayjs.Dayjs;
    setTime: (time: string) => void;
}

export default function StartTimePicker({ date, time, setTime }: StartTimePickerProps) {
    const [hour, minute] = time ? time.split(':').map(Number) : [0, 0];
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <TimeField label="Observing Start Time (UT)"
                value={date.set('hour', hour).set('minute', minute)}
                format="HH:mm"
                onChange={(newValue) => newValue && setTime(newValue.format('HH:mm:ss'))} />
        </LocalizationProvider>
    );
}

const to_lower_case_keys = (obj: Too) => {
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
            key.toLowerCase(),
            value,
        ])
    );
}


const DAY_MIN = 24 * 60;
const DURATION_RE = /^\d{1,2}:[0-5]\d:[0-5]\d$/; // H:MM:SS
const HST_NOON_UT_MIN = 22 * 60; // noon HST = 22:00 UT

const to_minutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
}

// Minutes since noon HST (22:00 UT), so a night that wraps past 00:00 UT is a monotonic range.
const night_minutes = (utMinutes: number) => (utMinutes - HST_NOON_UT_MIN + 2 * DAY_MIN) % DAY_MIN;

// The scheduled program the ToO would interrupt: the one on the instrument's telescope
// whose schedule block contains the requested start time on the observing date (HST).
// Schedule StartTime/EndTime and the ToO start time are both UT.
const find_interrupted_program = (
    schedule: ScheduleItem[],
    instrumentsStatusResp: InstrumentStatusResponse,
    instrument: string,
    obsdate: string,
    starttimeUT: string,
): ScheduleItem | undefined => {
    if (!instrument || !obsdate || !starttimeUT) return undefined;
    const telNr = (instrumentsStatusResp[instrument] ?? Object.values(instrumentsStatusResp)
        .find(s => s.Instrument?.toUpperCase() === instrument.toUpperCase()))?.TelNr;
    const start = night_minutes(to_minutes(starttimeUT));
    return schedule.find(item => {
        if (dayjs(item.Date).format('YYYY-MM-DD') !== obsdate) return false;
        const onTelescope = telNr !== undefined
            ? String(item.TelNr) === String(telNr)
            : item.Instrument?.toUpperCase().startsWith(instrument.toUpperCase());
        if (!onTelescope || !item.StartTime || !item.EndTime) return false;
        const blockStart = night_minutes(to_minutes(item.StartTime));
        const blockEnd = night_minutes(to_minutes(item.EndTime)) || DAY_MIN;
        return blockStart <= start && start < blockEnd;
    });
}

export interface Props {
    semester: string;
    obsid: string;
    schedule: ScheduleItem[];
    instrumentsStatusResp: InstrumentStatusResponse;
    setTooWindow: (tooWindow: TooWindow | null) => void;
    date: any;
    setDate: (date: dayjs.Dayjs) => void;
    userinfo: any;
}


const INTERRUPT_TYPES: InterruptType[] = ['partner', 'institution'];
const FLEXIBILITY_OPTIONS: string[] = ['+/- 0:00:00', '+/- 1:00:00', '+/- 2:00:00', '+/- 3:00:00', '+/- 4:00:00'];
const OBSERVER_LOCATIONS: string[] = ['Remote', 'HQ'];

export const TooForm = (props: Props) => {
    const { semester, obsid, schedule, instrumentsStatusResp, setTooWindow, date, setDate, userinfo } = props;
    const [tooItems, setTooItems] = useState<TooItem[]>([]);
    const [tooRequests, setTooRequests] = useState<Too[]>([]);
    const [selectedTooItem, setSelectedTooItem] = useState<TooItem | null>(null);

    const [too, setToo] = useState<Too>(BASE_TOO as Too)
    const [tooSavedTrigger, setTooSavedTrigger] = useState(0);

    useEffect(() => {
        setToo((prevToo) => {
            return ({
                ...prevToo,
                semester: semester,
                projcode: selectedTooItem?.ProjCode || '',
                piid: obsid,
                skipsubmitwarnings: 1,
                obsdate: date.format('YYYY-MM-DD'),
                starttime: new Date().toISOString().slice(11, 19), // current time in UT (HH:mm:ss)
                submitterid: obsid,
                instrconfigs: [],
                username: userinfo?.username || '',
                action: 'draft'
            });
        }); // Initialize too with default values
    }, [selectedTooItem, date, userinfo]);

    // Interrupted program is read-only: derived from the schedule, instrument, observing date and start time.
    // Only recompute once the loaded schedule is for this ToO's observing date.
    const scheduleLoadedForObsdate = schedule.some(item => dayjs(item.Date).format('YYYY-MM-DD') === too.obsdate);
    useEffect(() => {
        if (!scheduleLoadedForObsdate) return;
        const interruptproj = find_interrupted_program(schedule, instrumentsStatusResp, too.instrument, too.obsdate, too.starttime)?.ProjCode ?? '';
        setToo(prevToo => prevToo.interruptproj === interruptproj ? prevToo : { ...prevToo, interruptproj });
    }, [schedule, instrumentsStatusResp, scheduleLoadedForObsdate, too.instrument, too.obsdate, too.starttime]);

    // Report the projected ToO time block so the schedule panel can overlay it on the instrument's telescope.
    useEffect(() => {
        if (!too.instrument || !too.obsdate || !too.starttime || !DURATION_RE.test(too.duration ?? '')) {
            setTooWindow(null);
            return;
        }
        setTooWindow({
            telNr: instrumentsStatusResp[too.instrument]?.TelNr,
            obsdate: too.obsdate,
            starttime: too.starttime,
            duration: too.duration,
        });
    }, [setTooWindow, instrumentsStatusResp, too.instrument, too.obsdate, too.starttime, too.duration]);



    const clear_form = () => {
        setToo(BASE_TOO as Too);
        setSelectedTooItem(null);
    }

    const refresh_too_requests = async () => {
        try {
            const data = await get_too_requests(semester, obsid);
            if (Array.isArray(data)) {
                console.log('Fetched ToO Requests:', data);
                const newTooRequests = data.map((tooReq: Too) => {
                    // Convert obsdate to YYYY-MM-DD format if it's not already
                    return to_lower_case_keys(tooReq) as Too
                })
                setTooRequests(newTooRequests);
                return newTooRequests;
            }
        } catch (error) {
            console.error('Error fetching TOOs:', error);
        }
    }

    useEffect(() => {
        const fetchToos = async () => {
            console.log('TooForm component mounted with target:');
            try {
                const data = await get_too_items(semester, obsid);
                console.log('Fetched ToO Line Items:', data);
                setTooItems(data);
                setSelectedTooItem(data.length > 0 ? data[0] : null);
            } catch (error) {
                console.error('Error fetching TOOs:', error);
            }
            refresh_too_requests();

        };
        fetchToos();
    }, [semester, obsid]);

    useEffect(() => {
        refresh_too_requests();
    }, [tooSavedTrigger]);


    const call_save_too = async (action: ActionType) => {
        console.log('Saving ToO request with the following details:');
        console.log('too:', too, 'action:', action);
        const respjson = await submit_too_request({ ...too, action, skipsubmitwarnings: 1 });

        if (respjson.status !== 'success') {
            throw new Error('Failed to save ToO request: ' + respjson.message);
        }
        if (respjson.tooid) {
            setToo(prevToo => ({ ...prevToo, tooid: respjson.tooid, reqstatus: respjson.reqstatus}));
        }

        //update the too requests list
        setTooSavedTrigger(prev => prev + 1);
        console.log('ToO request saved successfully.');
    }

    const call_too_delete = async (too: Too) => {
        console.log('Deleting ToO request with the following details:');
        if (!too.tooid) return;
        await delete_too_request(too.tooid);
        console.log('ToO request deleted successfully.');
        //update the too requests list to exclude the deleted too
        setTooSavedTrigger(prev => prev + 1);
        setToo(prevToo => ({ ...prevToo, tooid: undefined, reqstatus: undefined }));
    }

    const call_too_cancel = async (too: Too) => {
        console.log('Cancelling ToO request with the following details:');
        const respjson = await submit_too_cancel(too.tooid ?? '', 'cancelled via online interface');
        respjson.status !== 'success' && console.error('Failed to cancel ToO request: ' + respjson.message);
        if (respjson.status === 'success') {
            console.log('Received cancelled resp:', respjson);
            setToo(prevToo => ({ ...prevToo, reqstatus: 'cancelled' }));
            setTooSavedTrigger(prev => prev + 1);
        }
        console.log('ToO request cancelled successfully.');
    }

    const projCodes = tooItems.map(tooItem => tooItem.ProjCode);
    // Instruments selectable for a ToO: those marked ToO Ready in the Instrument ToO Readiness table.
    const readyInstruments = Object.entries(instrumentsStatusResp)
        .filter(([, status]) => status.TooReady)
        .map(([inst]) => inst);
    const validDuration = DURATION_RE.test(too.duration ?? '') && too.duration !== '0:00:00';
    const incompleteToo = !too.instrument || !too.obsdate || !too.starttime || !validDuration || !too.interruptproj || !too.interrupttype;
    const submitMsg = ['scheduled', 'cancelled'].includes(too.reqstatus ?? '') ? 'Edit ToO' : too.reqstatus==='draft' ? 'Edit ToO Draft' : 'Create ToO'
    const saveType: ActionType = too.reqstatus === 'submitted' ? 'edit' : 'draft'

    return (
        <Stack sx={{
            paddingTop: '16px',
            display: 'flex',
            flexWrap: 'wrap',
        }}
            justifyContent='center'
            maxWidth='100%'
        >
            <StyledPaper
            >
                <Box>
                    <Typography variant="h5" align="center" sx={{ marginBottom: '16px' }}>
                        ToO Form
                    </Typography>
                    <Stack sx={{ marginBottom: '24px' }} width="100%" direction="column" justifyContent='center' spacing={2}>
                        <Stack sx={{ marginBottom: '24px' }} width="100%" direction="row" justifyContent='center' spacing={2}>
                            <DayjsDatePicker
                                date={date}
                                setDate={setDate}
                            />
                        </Stack>
                        <Stack width="100%" direction="row" justifyContent='center' spacing={2}>
                            <Tooltip title={'Select existing ToO Request to edit/view'} placement='right'>
                                <FormControl fullWidth sx={{ width: 150, alignSelf: "center" }}>
                                    <InputLabel id="select-too-request">Select ToO</InputLabel>
                                    <Select
                                        labelId="select-too-request"
                                        id="select-too-request"
                                        required
                                        value={too?.tooid ? too.target + '-' + too.tooid : ''}
                                        label="Program Id"
                                        onChange={(event) => {
                                            const tooReq = tooRequests.find(too => too.target + '-' + too.tooid === event.target.value);
                                            console.log('Selected value:', event, tooRequests, tooReq);

                                            if (tooReq) {
                                                console.log('Selected ToO Request:', tooReq);
                                                setToo(to_lower_case_keys(tooReq) as Too);
                                            }
                                        }}
                                    >
                                        {tooRequests && tooRequests.map(too => (
                                            <MenuItem key={too.tooid} value={too.target + '-' + too.tooid}>{too.target + '-' + too.tooid}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Tooltip>
                            <Button
                                variant="contained"
                                onClick={clear_form}
                                sx={{ width: 150, alignSelf: "center" }}
                            >
                                Clear Form
                            </Button>
                        </Stack>
                        <Tooltip title={'select ToO program id'} placement='right'>
                            <FormControl fullWidth sx={{ width: 150, alignSelf: "center" }}>
                                <InputLabel
                                    id="select-program-id">Program ID</InputLabel>
                                <Select
                                    labelId="select-program-id"
                                    id="select-program-id"
                                    required
                                    value={selectedTooItem?.ProjCode || ''}
                                    label="Program Id"
                                    onChange={(event) => {
                                        const tooItem = tooItems.find(tooItem => tooItem.ProjCode === event.target.value);
                                        if (tooItem) {
                                            setSelectedTooItem(tooItem)
                                        }
                                    }}
                                >
                                    {projCodes.map(code => (
                                        <MenuItem key={code} value={code}>{code}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Tooltip>
                    </Stack>
                    <Stack sx={{ marginBottom: '24px' }} width="100%" direction="row" justifyContent='center' spacing={2}>
                        <Typography variant="h6" sx={{ alignSelf: 'center' }}>
                            {`Remaining Institution Hours: ${selectedTooItem?.HoursRemainInstitution || '0'}`}
                        </Typography>
                        <Typography variant="h6" sx={{ alignSelf: 'center' }}>
                            {`Remaining Partner Hours: ${selectedTooItem?.HoursRemainPartner || '0'}`}
                        </Typography>
                        <Typography variant="h6" sx={{ alignSelf: 'center' }}>
                            {`Can Interrupt Institutions: ${selectedTooItem?.InterruptList || ''}`}
                        </Typography>
                    </Stack>
                    <Stack sx={{ marginBottom: '24px' }} width="100%" direction="row" justifyContent='center' spacing={2}>
                        <Tooltip title={'Enter Target Name'} placement='right'>
                            <TextField
                                sx={{ width: 250, alignSelf: "center" }}
                                label="Target Name"
                                slotProps={{ inputLabel: { shrink: too.target ? true : false } }}
                                value={too.target ?? ''}
                                onChange={(evt) => setToo(prevToo => ({ ...prevToo, target: evt.target.value }))}
                            />
                        </Tooltip>
                    </Stack>
                    <Stack sx={{ marginBottom: '24px' }} width="100%" direction="row" justifyContent='center' spacing={2}>
                        <Tooltip title={'select Interrupt type'} placement='right'>
                            <FormControl fullWidth sx={{ width: 250, alignSelf: "center" }}>
                                <InputLabel id="interrupt-type">Interrupt type</InputLabel>
                                <Select
                                    labelId="select-interrupt-type"
                                    id="select-interrupt-type"
                                    value={too.interrupttype ?? ''} //empty string needed to programatically display set value
                                    label="Interrupt Type"
                                    onChange={(evt) => {
                                        console.log('Selected Interrupt Type:', evt.target.value);
                                        setToo(prevToo => (
                                            console.log('Previous ToO State:', prevToo, prevToo.interrupttype === evt.target.value),
                                            {
                                                ...prevToo,
                                                interrupttype: evt.target.value as InterruptType,
                                            }
                                        ));
                                    }}
                                >
                                    {INTERRUPT_TYPES.map(it => (
                                        <MenuItem key={it} value={it}>{it}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Tooltip>
                        <Tooltip title={'select Instrument'} placement='right'>
                            <FormControl fullWidth sx={{ width: 250, alignSelf: "center" }}>
                                <InputLabel id="select-instrument">Instrument</InputLabel>
                                <Select
                                    labelId="select-instrument"
                                    id="select-instrument"
                                    value={too.instrument ?? ''}
                                    required
                                    label="Instrument"
                                    onChange={(evt) => {
                                        setToo(prevToo => ({
                                            ...prevToo,
                                            instrument: evt.target.value,
                                        }));
                                    }}
                                >
                                    {readyInstruments.map(inst => (
                                        <MenuItem key={inst} value={inst}>{inst}</MenuItem>
                                    ))}
                                    {/* keep a loaded ToO's instrument displayable even if it is not ToO ready on this date */}
                                    {too.instrument && !readyInstruments.includes(too.instrument) && (
                                        <MenuItem key={too.instrument} value={too.instrument} disabled>{`${too.instrument} (not ToO ready)`}</MenuItem>
                                    )}
                                </Select>
                            </FormControl>
                        </Tooltip>
                        <Tooltip title={'Scheduled program on the instrument\'s telescope at the observing date and start time'} placement='right'>
                            <TextField
                                id="interrupted-program"
                                sx={{ width: 250, alignSelf: "center" }}
                                label="Interrupted Program"
                                value={too.interruptproj ?? ''}
                                placeholder={too.instrument ? 'No scheduled program' : 'Select instrument'}
                                slotProps={{ inputLabel: { shrink: true }, input: { readOnly: true } }}
                            />
                        </Tooltip>

                    </Stack>
                    <Stack sx={{ marginBottom: '24px' }} width="100%" direction="row" justifyContent='center' spacing={2}>
                        <Tooltip title={'Select Flexibility'} placement='right'>
                            <FormControl fullWidth sx={{ width: 250, alignSelf: "center" }}>
                                <InputLabel id="flex-time">Flexibility</InputLabel>
                                <Select
                                    labelId="select-flex-time"
                                    id="select-flex-time"
                                    value={too.flextime ?? ''}
                                    label="Flexibility"
                                    onChange={(evt) => {
                                        setToo(prevToo => ({
                                            ...prevToo,
                                            flextime: evt.target.value,
                                        }));
                                    }}
                                >
                                    {FLEXIBILITY_OPTIONS.map(fo => (
                                        <MenuItem key={fo} value={fo}>{fo}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Tooltip>
                        <Tooltip title={'Select Observer Location'} placement='right'>
                            <FormControl fullWidth sx={{ width: 250, alignSelf: "center" }}>
                                <InputLabel id="observer-location">Observer Location</InputLabel>
                                <Select
                                    labelId="select-observer-location"
                                    id="select-observer-location"
                                    value={too.obslocation ?? ''}
                                    label="Observer Location"
                                    onChange={(evt) => {
                                        setToo(prevToo => ({
                                            ...prevToo,
                                            obslocation: evt.target.value,
                                        }));
                                    }}
                                >
                                    {OBSERVER_LOCATIONS.map(ol => (
                                        <MenuItem key={ol} value={ol}>{ol}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Tooltip>
                        <TextField
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={{ width: 250, alignSelf: "center" }}
                            label="Request Status"
                            value={too.reqstatus ?? ''}
                        />
                    </Stack>
                    <Stack sx={{ marginBottom: '24px' }} width="100%" direction="row" justifyContent='center' spacing={2}>
                        <Tooltip title={'Include any notes'} placement='right'>
                            <FormControl fullWidth sx={{ width: 250, alignSelf: "center" }}>
                                <TextField
                                    id="notes"
                                    label="Notes"
                                    slotProps={{ inputLabel: { shrink: too.pinotes ? true : false } }}
                                    placeholder="Enter any notes here"
                                    multiline
                                    variant="outlined"
                                    value={too.pinotes}
                                    onChange={(evt) => {
                                        setToo(prevToo => ({
                                            ...prevToo,
                                            pinotes: evt.target.value,
                                        }));
                                    }}
                                />
                            </FormControl>
                        </Tooltip>
                        <Tooltip title={'ToO duration as H:MM:SS'} placement='right'>
                            <TextField
                                sx={{ width: 250, alignSelf: "center" }}
                                label="Duration (H:MM:SS)"
                                value={too.duration ?? ''}
                                placeholder="1:00:00"
                                slotProps={{ inputLabel: { shrink: true } }}
                                error={!!too.duration && !validDuration}
                                helperText={too.duration && !validDuration ? 'Use H:MM:SS, e.g. 1:30:00' : ' '}
                                onChange={(evt) => setToo(prevToo => ({ ...prevToo, duration: evt.target.value }))}
                            />
                        </Tooltip>
                        <StartTimePicker
                            date={date}
                            time={too.starttime}
                            setTime={(time) => setToo(prevToo => ({ ...prevToo, starttime: time }))}
                        />
                    </Stack>
                    <Stack direction="row" justifyContent="center" spacing={2} sx={{ paddingBottom: '16px' }}>
                        <Tooltip title={'Save ToO request draft'}>
                            <Button
                                variant="contained"
                                onClick={() => call_save_too(saveType)}
                                disabled={incompleteToo}
                            >
                                {submitMsg}
                            </Button>
                        </Tooltip>
                        <Tooltip title={'Submit ToO request'}>
                            <Button
                                variant="contained"
                                onClick={() => call_save_too('submit')}
                                disabled={!too.tooid}
                            >
                                Submit ToO
                            </Button>
                        </Tooltip>
                        <Tooltip title={'Cancel ToO request'}>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    call_too_cancel(too);
                                }}
                                disabled={!too.tooid}
                            >
                                Cancel ToO
                            </Button>
                        </Tooltip>
                        <Tooltip title={'Delete ToO request'}>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    call_too_delete(too);
                                }}
                                disabled={!too.tooid}
                            >
                                Delete ToO
                            </Button>
                        </Tooltip>
                        <TooInterruptDialogButton too={too} userinfo={userinfo} />
                    </Stack>
                </Box>
            </StyledPaper>
        </Stack >
    )
}