import { Tooltip, TextField, Stack, Box, Typography, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import { StyledPaper } from './App';
import { useEffect, useState } from 'react';
import { BASE_TOO, KECK_API_URL } from './config';
import { DayjsDatePicker, type ScheduleItem } from './schedule_panel';
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


export interface Props {
    semester: string;
    obsid: string;
    schedule: ScheduleItem[];
    date: any;
    setDate: (date: dayjs.Dayjs) => void;
    userinfo: any;
}

type ActionType = 'draft' | 'submit' | 'edit' | 'created';
type InterruptType = 'partner' | 'institution';

const INTERRUPT_TYPES: InterruptType[] = ['partner', 'institution'];
const FLEXIBILITY_OPTIONS: string[] = ['+/- 0:00:00', '+/- 1:00:00', '+/- 2:00:00', '+/- 3:00:00', '+/- 4:00:00'];
const OBSERVER_LOCATIONS: string[] = ['Remote', 'HQ'];

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


export const TooForm = (props: Props) => {
    const { semester, obsid, schedule, date, setDate, userinfo } = props;
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
                starttime: dayjs().format('HH:mm:ss'),
                submitterid: obsid,
                instrconfigs: [],
                username: userinfo?.username || '',
                action: 'draft'
            });
        }); // Initialize too with default values
    }, [selectedTooItem, date, userinfo]);



    const clear_form = () => {
        setToo(BASE_TOO as Too);
        setSelectedTooItem(null);
    }

    const get_too_requests = async () => {
        try {
            const response = await fetch(`${KECK_API_URL}/too/getTooRequests?semester=${semester}&obsid=${obsid}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json()
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
                const response = await fetch(`${KECK_API_URL}/too/getToo?semester=${semester}&obsid=${obsid}`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                console.log('Fetched ToO Line Items:', data);
                setTooItems(data);
                setSelectedTooItem(data.length > 0 ? data[0] : null);
            } catch (error) {
                console.error('Error fetching TOOs:', error);
            }
            get_too_requests();

        };
        fetchToos();
    }, [semester, obsid]);

    useEffect(() => {
        get_too_requests();
    }, [tooSavedTrigger]);


    const call_save_too = async (action: ActionType) => {
        console.log('Saving ToO request with the following details:');
        console.log('too:', too, 'action:', action);
        const resp = await fetch(`${KECK_API_URL}too/submitTooRequest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...too, action, skipsubmitwarnings: 1 }),

        });
        if (!resp.ok) {
            throw new Error('Failed to save ToO request');
        }

        const respjson = await resp.json();

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
        const resp = await fetch(`${KECK_API_URL}too/deleteTooRequest?tooid=${too.tooid}`, {
            method: 'DELETE'
        });
        if (!resp.ok) {
            throw new Error('Failed to delete ToO request');
        }
        console.log('ToO request deleted successfully.');
        //update the too requests list to exclude the deleted too
        setTooSavedTrigger(prev => prev + 1);
        setToo(prevToo => ({ ...prevToo, tooid: undefined, reqstatus: undefined }));
    }

    const call_too_cancel = async (too: Too) => {
        console.log('Cancelling ToO request with the following details:');
        const cancelRequest = { 'tooid': too.tooid ?? '', 'approvalnotes': 'cancelled via online interface' };
        const resp = await fetch(`${KECK_API_URL}too/submitTooCancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cancelRequest),
        });
        if (!resp.ok) {
            throw new Error('Failed to save ToO request');
        }
        const respjson = await resp.json();
        respjson.status !== 'success' && console.error('Failed to cancel ToO request: ' + respjson.message);
        if (respjson.status === 'success') {
            console.log('Received cancelled resp:', respjson);
            setToo(prevToo => ({ ...prevToo, reqstatus: 'cancelled' }));
            setTooSavedTrigger(prev => prev + 1);
        }
        console.log('ToO request cancelled successfully.');
    }

    const projCodes = tooItems.map(tooItem => tooItem.ProjCode);
    const incompleteToo = !too.instrument || !too.obsdate || !too.starttime || !too.duration || !too.interruptproj || !too.interrupttype;
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
                                    {selectedTooItem?.InstrumentList.split(' ').map(inst => (
                                        <MenuItem key={inst} value={inst}>{inst}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Tooltip>
                        <Tooltip title={'Select Interrupted Program'} placement='right'>
                            <FormControl fullWidth sx={{ width: 250, alignSelf: "center" }}>
                                <InputLabel id="interrupted-program">Interrupted Program</InputLabel>
                                <Select
                                    labelId="select-interrupted-program"
                                    id="select-interrupted-program"
                                    required
                                    value={too?.interruptproj ?? ''}
                                    label="Interrupted Program"
                                    onChange={(evt) => {
                                        setToo(prevToo => ({
                                            ...prevToo,
                                            interruptproj: evt.target.value,
                                        }));
                                    }}
                                >
                                    {schedule.map(ol => (
                                        <MenuItem key={ol.ProjCode} value={ol.ProjCode}>{ol.ProjCode}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
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
                        <TextField sx={{ width: 250, alignSelf: "center" }} label="Duration" value={too.duration} />
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