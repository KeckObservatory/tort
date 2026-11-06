import { createTheme, type PaletteMode, type Theme } from '@mui/material/styles';

export const handleTheme = (darkState: boolean | null | undefined): Theme => {
  const palletType = darkState ? "dark" : "light" as PaletteMode
  const themeOptions = {
    typography: {
      fontFamily: 'Droid Serif',
    },
    palette: {
      mode: palletType,
      primary: {
        main: '#74d6cfff',
        //contrastText: '#e9ca90',
      },
      secondary: {
        main: '#c1973bff',
      },
      background: {
        default: '#d0c3daff',
      },
      text: {
        //primary: palletType === 'light' ? '#000000' : '#e9ca90',
        primary: '#000000' ,
      },
      DataGrid: {
        bg: palletType === 'light' ? '#f8fafc' : '#334155',
        pinnedBg: palletType === 'light' ? '#f1f5f9' : '#293548',
        headerBg: palletType === 'light' ? '#eaeff5' : '#1e293b',
      }
    }}
  const theme = createTheme(themeOptions)
  return theme
  }