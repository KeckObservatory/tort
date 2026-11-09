import { useEffect, useMemo, useState } from 'react'
import { CssBaseline, Paper, Skeleton, Stack, styled, ThemeProvider } from '@mui/material'
import { handleTheme } from './theme'
import { TopBar } from './top_bar'
import { TooForm } from './too_form'
import dayjs from 'dayjs'
import { SchedulePanel } from './schedule_panel'
import { get_userinfo, type InstrumentStatusResponse, type ScheduleItem, type TooWindow, type UserInfo } from './api/api_root'


const get_semester = (date: dayjs.Dayjs) => {
  const month = date.month() + 1; // month is 0-indexed in dayjs
  if (month >= 2 && month <= 7) return `${date.year()}A`;
  // Aug–Dec belong to this year's B; January belongs to last year's B.
  return `${month === 1 ? date.year() - 1 : date.year()}B`;
}

export const StyledPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'sx'
})(
  {
    elevation: 3,
    padding: '12px',
    margin: '6px',
  });

function App() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [instrumentsStatusResp, setInstrumentsStatusResp] = useState<InstrumentStatusResponse>({});
  const [tooWindow, setTooWindow] = useState<TooWindow | null>(null);

  const [userinfo, setUserInfo] = useState<UserInfo | null>(null)
  const now = dayjs()
  console.log('Current time:', now.format('YYYY-MM-DD HH:mm:ss'))
  const [date, setDate] = useState<dayjs.Dayjs>(now)

  const semester = useMemo(() => get_semester(date), [date])

  const darkMode = false // This can be replaced with a state or prop to toggle dark mode


  useEffect(() => {
    const handleUserinfo = async () => {
      try {
        setUserInfo(await get_userinfo())
        console.log('Userinfo fetched successfully.')
      } catch (error) {
        console.error('userinfo fetch failed:', error)
      }
    }
    handleUserinfo()
  }, [])

  const theme = useMemo(() => {
    const newTheme = handleTheme(darkMode)
    console.log('Theme:', newTheme)
    return newTheme
  }, [darkMode])

  return (
    <div className="App" style={{
      "margin": "0 auto",
      "padding": "2rem",
      "textAlign": "center",
    }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TopBar userinfo={userinfo} />
        {userinfo ? (
            <Stack width='100%' direction="column" spacing={2} justifyContent="center">
              <Stack width='100%' direction="column" spacing={2} justifyContent="center">
                <TooForm obsid={String(userinfo.Id)} schedule={schedule} instrumentsStatusResp={instrumentsStatusResp} setTooWindow={setTooWindow} semester={semester} date={date} setDate={setDate} userinfo={userinfo} />
                <SchedulePanel date={date} setDate={setDate} setSchedule={setSchedule} instrumentsStatusResp={instrumentsStatusResp} setInstrumentsStatusResp={setInstrumentsStatusResp} tooWindow={tooWindow} />
              </Stack>
            </Stack>
        ) : (
          <Skeleton variant="rectangular" width={"100%"} height={118} />
        )
        }
      </ThemeProvider >
    </div >
  )
}

export default App
