import { Stack, Paper, Box, Typography, Skeleton } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Dayjs } from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useEffect, useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { StyledPaper } from './App';
import { get_instruments_too_status, get_schedule, get_schedule_image, type InstrumentStatusResponse, type SchedImg, type ScheduleItem, type TooWindow } from './api/api_root';

// Geometry of the server-rendered schedule PNG (1000x200 px). Its time axis is fixed at 03:00-18:00 UT
// across the plot area, and the schedule blocks sit in a horizontal band.
const IMG_W = 1000;
const IMG_H = 200;
const AXIS_X0 = 15;   // px at 03:00 UT
const AXIS_X1 = 985;  // px at 18:00 UT
const AXIS_T0 = 3 * 60;  // minutes UT
const AXIS_T1 = 18 * 60; // minutes UT
const BAND_Y0 = 21;
const BAND_Y1 = 132;

const hms_to_minutes = (time: string) => {
    const [h, m = 0, s = 0] = time.split(':').map(Number);
    return h * 60 + m + s / 60;
}

const minutes_to_hhmm = (minutes: number) => {
    const m = Math.round(((minutes % 1440) + 1440) % 1440);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

const minutes_to_x = (minutes: number) =>
    AXIS_X0 + (minutes - AXIS_T0) * (AXIS_X1 - AXIS_X0) / (AXIS_T1 - AXIS_T0);

// Semi-transparent block over the schedule image marking the projected ToO time.
const TooOverlay = ({ tooWindow }: { tooWindow: TooWindow }) => {
    const start = hms_to_minutes(tooWindow.starttime);
    const end = start + hms_to_minutes(tooWindow.duration);
    const clippedStart = Math.max(start, AXIS_T0);
    const clippedEnd = Math.min(end, AXIS_T1);
    if (!(clippedEnd > clippedStart)) return null; // outside the plotted night

    const left = minutes_to_x(clippedStart);
    const width = minutes_to_x(clippedEnd) - left;
    return (
        <Box
            title={`Projected ToO ${minutes_to_hhmm(start)} - ${minutes_to_hhmm(end)} UT`}
            sx={{
                position: 'absolute',
                left: `${left / IMG_W * 100}%`,
                width: `${width / IMG_W * 100}%`,
                top: `${(BAND_Y0 - 6) / IMG_H * 100}%`,
                height: `${(BAND_Y1 - BAND_Y0 + 12) / IMG_H * 100}%`,
                backgroundColor: 'rgba(211, 47, 47, 0.35)',
                border: '2px dashed rgb(211, 47, 47)',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between', // "ToO" at the top, time range at the bottom
                overflow: 'hidden',
                pointerEvents: 'auto',
            }}
        >
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'rgb(140, 20, 20)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                ToO
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'rgb(140, 20, 20)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                {`${minutes_to_hhmm(start)}-${minutes_to_hhmm(end)}`}
            </Typography>
        </Box>
    );
}

interface ScheduleTableProps {
    scheduleImg: SchedImg[];
    date: Dayjs;
    instrumentStatusResp: InstrumentStatusResponse;
    tooWindow: TooWindow | null;
}

export const ScheduleTable = ({ instrumentStatusResp, scheduleImg, date, tooWindow }: ScheduleTableProps) => {

    // Image file names look like .../k2_20261110_1.png
    const showOverlay = (img: SchedImg) =>
        !!tooWindow
        && tooWindow.telNr !== undefined
        && String(tooWindow.telNr) === String(img.TelNr)
        && tooWindow.obsdate.replaceAll('-', '') === img.file.split('_').at(-2);

    const interior = scheduleImg.length > 0 ? (
        <Stack direction="column" spacing={0} justifyContent="center">
            {scheduleImg.map((img, index) => (
                <Box key={index} sx={{ textAlign: 'center' }}>
                    <Box sx={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: 1200 }}>
                        <img src={`data:image/png;base64,${img.img}`} alt={`Schedule for TelNr ${img.TelNr}`} style={{ display: 'block', width: '100%', height: 'auto' }} />
                        {tooWindow && showOverlay(img) && <TooOverlay tooWindow={tooWindow} />}
                    </Box>
                    <Box><Typography variant="caption">Telescope {img.TelNr}</Typography></Box>
                </Box>
            ))}
        </Stack>
    ) : (
        <>
            <Typography variant="body1" align="center">Loading...</Typography>
            <Skeleton variant="rectangular" width={"100%"} height={550} />
        </>
    );

    const dateMatchesSchedule = date.format('YYYYMMDD') === scheduleImg.at(0)?.file.split('_')[1];

    const scheduleLabel = dateMatchesSchedule ? `Schedule for ${date.format('MMMM D, YYYY')}` : `Schedule for ${date.format('MMMM D, YYYY')} Loading...`;


    return (
        <Grid container spacing={4} justifyContent="center">
            <Grid size={9} justifyContent='center' sx={{ minWidth: 0 }}>
                <Box sx={{ marginTop: '16px' }}>
                    <Typography variant="h6" align="center">{scheduleLabel}</Typography>
                    {interior}
                </Box>
            </Grid>
            <Grid size={3} justifyContent='center' sx={{ minWidth: 0, overflowX: 'auto' }}>
                <Typography variant="h6" align="center">Instrument ToO Readiness</Typography>
                <TableContainer sx={{ maxWidth: 1000, justifyContent: 'center' }} component={Paper}>
                    <Table sx={{ maxWidth: 1000, justifyContent: 'center' }} size='small' aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell align="left">Too Ready?</TableCell>
                                <TableCell align="left">Instrument?</TableCell>
                                <TableCell align="right">Telescope</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.entries(instrumentStatusResp)
                                .sort(([, a], [, b]) => {
                                    if (a.TooReady && !b.TooReady) {
                                        return -1; // a comes before b
                                    }
                                    if (!a.TooReady && b.TooReady) {
                                        return 1; // b comes before a
                                    }
                                    if ((a.TelNr ?? 0) > (b.TelNr ?? 0)) {
                                        return 1; // a comes before b
                                    }
                                    if ((a.TelNr ?? 0) < (b.TelNr ?? 0)) {
                                        return -1; // b comes before a
                                    }
                                    return 0; // keep original order if both are the same
                                })
                                .map(([key, row]) => (
                                    <TableRow
                                        key={key}
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        <TableCell component="th" scope="row">
                                            {row.TooReady ? 'Yes' : 'No'}
                                        </TableCell>
                                        <TableCell component="th" scope="row">
                                            {key}
                                        </TableCell>
                                        <TableCell align="right">{row.TelNr}</TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </TableContainer>
            </Grid>
        </Grid>
    );
}

export const DayjsDatePicker = ({ date, setDate }: { date: Dayjs, setDate: (date: Dayjs) => void }) => {
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
                label="Observing Date (HT)"
                value={date}
                onChange={(newValue) => newValue && setDate(newValue)} />
        </LocalizationProvider>
    );
}

export interface Props {
    date: Dayjs;
    setDate: (date: Dayjs) => void;
    setSchedule: (schedule: ScheduleItem[]) => void;
    instrumentsStatusResp: InstrumentStatusResponse;
    setInstrumentsStatusResp: (status: InstrumentStatusResponse) => void;
    tooWindow: TooWindow | null;
}

export const SchedulePanel = (props: Props) => {
    const { date, setDate, setSchedule, instrumentsStatusResp, setInstrumentsStatusResp, tooWindow } = props;
    const [scheduleImg, setScheduleImg] = useState<SchedImg[]>([]);

    useEffect(() => {

        const dateString = date.format('YYYY-MM-DD');

        const getScheduleImage = async () => {
            try {
                const schedImg = await Promise.all(['1', '2'].map(telnr => get_schedule_image(dateString, telnr)));
                setScheduleImg(schedImg);
            } catch (error) {
                console.error('Failed to fetch schedule image:', error);
            }
        }

        const getSchedule = async () => {
            try {
                const sched = await Promise.all(['1', '2'].map(telnr => get_schedule(dateString, telnr)));
                setSchedule(sched.flat());
            } catch (error) {
                console.error('Failed to fetch schedule:', error);
            }
        }

        const getInstrumentsStatus = async () => {
            try {
                setInstrumentsStatusResp(await get_instruments_too_status(dateString));
            } catch (error) {
                console.error('Failed to fetch instruments:', error);
            }
        }

        console.log('Fetching schedule for date:', date.format('YYYY-MM-DD'));
        getSchedule();
        getScheduleImage();
        getInstrumentsStatus();

    }, [date])

    return (
        <Stack sx={{
            paddingTop: '16px',
            display: 'flex',
            flexWrap: 'wrap',
        }}
            justifyContent='center'
            maxWidth='100%'
        >
            <StyledPaper>
                <Typography variant="h5" align="center" sx={{ marginBottom: '16px' }}>
                    Schedule
                </Typography>
                <Box>
                    <Stack sx={{ marginBottom: '24px' }} width="100%" direction="row" justifyContent='center' spacing={2}>
                        <DayjsDatePicker
                            date={date}
                            setDate={setDate}
                        />
                    </Stack>
                    <ScheduleTable date={date} scheduleImg={scheduleImg} instrumentStatusResp={instrumentsStatusResp} tooWindow={tooWindow} />
                </Box>
            </StyledPaper>
        </Stack>
    )
}