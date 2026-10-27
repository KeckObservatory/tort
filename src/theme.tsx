import { createTheme, type PaletteMode, type Theme } from '@mui/material/styles';
//import { type ThemeOptions } from '@mui/material/styles';

// to use myTheme in an application, pass it to the theme grid option

// export const lightTableTheme = themeMaterial
//   .withPart(iconSetMaterial)
//   .withParams({
//     accentColor: "#337ab7",
//     backgroundColor: "#ffffff",
//     browserColorScheme: "light",
//     cellTextColor: "#ffffff",
//     fontFamily: {
//       googleFont: "IBM Plex Mono"
//     },
//     fontSize: 18,
//     foregroundColor: "#f0f8ff",
//     headerFontSize: 14,
//     iconSize: 22,
//     oddRowBackgroundColor: "#fafafa"
//   });

// export const darkTableTheme = themeMaterial
//   .withPart(iconSetMaterial)
//   .withParams({
//     accentColor: "#BD7799",
//     backgroundColor: "#1D0F28",
//     browserColorScheme: "dark",
//     cellTextColor: "#2E7893",
//     fontFamily: {
//       googleFont: "IBM Plex Mono"
//     },
//     fontSize: 18,
//     foregroundColor: "#4C8493",
//     headerFontSize: 14,
//     iconSize: 22,
//     oddRowBackgroundColor: "#140F13"
//   });

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