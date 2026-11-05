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
import { get_instruments_too_status, get_schedule, get_schedule_image, type InstrumentStatusResponse, type SchedImg, type ScheduleItem } from './api/api_root';


interface ScheduleTableProps {
    scheduleImg: SchedImg[];
    date: Dayjs;
    instrumentStatusResp: InstrumentStatusResponse;
}

export const ScheduleTable = ({ instrumentStatusResp, scheduleImg, date }: ScheduleTableProps) => {

    const interior = scheduleImg.length > 0 ? (
        <Stack direction="column" spacing={0} justifyContent="center">
            {scheduleImg.map((img, index) => (
                <Box key={index} sx={{ textAlign: 'center' }}>
                    <img src={`data:image/png;base64,${img.img}`} alt={`Schedule for TelNr ${img.TelNr}`} style={{ maxWidth: '100%', height: 'auto' }} />
                    <Typography variant="caption">Telescope {img.TelNr}</Typography>
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
        <Grid container spacing={12} justifyContent="center">
            <Grid size={8} justifyContent='center'>
                <Box sx={{ marginTop: '16px' }}>
                    <Typography variant="h6" align="center">{scheduleLabel}</Typography>
                    {interior}
                </Box>
            </Grid>
            <Grid size={4} justifyContent='center'>
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
}

export const SchedulePanel = (props: Props) => {
    const { date, setDate, setSchedule } = props;
    const [instrumentsStatusResp, setInstrumentsStatusResp] = useState<InstrumentStatusResponse>({});
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
                    <ScheduleTable date={date} scheduleImg={scheduleImg} instrumentStatusResp={instrumentsStatusResp} />
                </Box>
            </StyledPaper>
        </Stack>
    )
}