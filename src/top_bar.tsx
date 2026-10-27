import AppBar from '@mui/material/AppBar';
// import Switch from "@mui/material/Switch"
import Tooltip from '@mui/material/Tooltip';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography'
import DoorFrontIcon from '@mui/icons-material/DoorFront';
import IconButton from '@mui/material/IconButton';
import { KECK_OBS_PORTAL } from './config';
import type { UserInfo } from './App';

interface Props {
  userinfo: UserInfo | null;
}

export function TopBar(props: Props) {

  const handleHomepageClick = () => {
    window.open(KECK_OBS_PORTAL, "_self")
  }



  return (
    <AppBar
      position='sticky'
    >
      <Toolbar
        sx={{
          paddingRight: '8px',
          paddingLeft: '20px'
        }}
      >
        <Typography
          component="h1"
          variant="h6"
          color="inherit"
          noWrap
          sx={{
            marginLeft: '12px',
            flexGrow: 1,
          }}
        >
          {props.userinfo?.Title} {props.userinfo?.FirstName} {props.userinfo?.LastName}
        </Typography>
        <Typography
          component="h1"
          variant="h6"
          color="inherit"
          noWrap
          sx={{
            marginLeft: '12px',
            flexGrow: 1,
          }}
        >
          Keck ToO Submission
        </Typography>
        <Tooltip title="Return to Keck Homepage">
          <IconButton
            aria-label="open drawer"
            onClick={handleHomepageClick}
          >
            <DoorFrontIcon id="observer-portal-icon" />
          </IconButton>
        </Tooltip>
        {/* <Tooltip title="Toggle on for dark mode">
          <Switch
            checked={props.darkMode}
            onChange={props.handleThemeChange} />
        </Tooltip> */}
      </Toolbar>
    </AppBar>
  )
}