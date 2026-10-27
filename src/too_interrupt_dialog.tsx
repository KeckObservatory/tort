import * as React from 'react';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import type { Too } from './too_form';
import type { UserInfo } from './App';
import { KECK_API_URL } from './config';


export interface TooInterruptDialogProps {
    open: boolean;
    onClose: () => void;
    interruptResult: TooInterruptResult | null;
}

function TooInterruptDialog(props: TooInterruptDialogProps) {
    const { onClose, interruptResult, open } = props;

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog onClose={handleClose} open={open}>
            <DialogTitle>Can ToO Interrupt?</DialogTitle>
            {interruptResult ? (
                interruptResult.canInterrupt ? (
                    <div>
                        <Typography variant="h6" component="div" sx={{ padding: '16px' }}>
                            This ToO can interrupt the following programs:
                        </Typography>
                        <List>
                            {interruptResult.programs.map((program, index) => (
                                <ListItem key={index}>
                                    <ListItemText
                                        primary={`Program: ${program.ProjCode} | Instrument: ${program.Instrument} | Date: ${program.Date} | Start Time: ${program.StartTime} | End Time: ${program.EndTime}`}
                                        secondary={
                                            <>
                                                {program.InstitutionInterrupt && (
                                                    <Typography component="span" variant="body2" color="error">
                                                        Institution Interrupt: {program.InstitutionReason.join(', ')}
                                                    </Typography>
                                                )}
                                                {program.PartnerInterrupt && (
                                                    <Typography component="span" variant="body2" color="error">
                                                        Partner Interrupt: {program.PartnerReason.join(', ')}
                                                    </Typography>
                                                )}
                                                {program.IsSwitch && (
                                                    <Typography component="span" variant="body2" color="primary">
                                                        (This is a switch)
                                                    </Typography>
                                                )}
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </div>
                ) : (
                    <Typography variant="h6" component="div" sx={{ padding: '16px' }}>
                        This ToO cannot interrupt any scheduled programs.
                    </Typography>
                )
            ) : (
                <Typography variant="h6" component="div" sx={{ padding: '16px' }}>
                    Loading...
                </Typography>
            )}
        </Dialog>
    );
}

interface Program {
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

interface TooInterruptResult {
    checkTimeHST: string
    InstrReadyWarn: boolean
    InstrState: string
    TelReayWarn: boolean
    TelState: string
    canInterrupt: boolean;
    error: boolean | string;
    programs: Program[];
}

interface Props {
    too: Too;
    userinfo: UserInfo;
}

export const TooInterruptDialogButton = (props: Props) => {
    const { too, userinfo } = props;
    const [open, setOpen] = React.useState(false);
    const [interruptResult, setInterruptResult] = React.useState<TooInterruptResult | null>(null);

    const call_too_can_interrupt = async (too: Too) => {
        console.log('Calling too_can_interrupt with:', too);
        const semid = too.semester + '_' + too.projcode;
        try {
            const params = new URLSearchParams(
                {
                    semid,
                    obsid: Number(userinfo.Id).toString(),
                    instr: too.instrument,
                    date: too.obsdate,
                    duration: too.duration,
                    starttime: too.starttime,
                }
            ).toString()
            const response = await fetch(`${KECK_API_URL}too/getTooCanInterrupt?${params}`, {
                method: 'GET',
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const res = await response.json();
            setInterruptResult(res)
            console.log('Response from can_interrupt:', res);
        } catch (error) {
            console.error('Error in can_interrupt:', error);
        }
    }


    const handleClickOpen = () => {
        call_too_can_interrupt(too);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <>
            <Tooltip title={'Validate ToO request'}>
                <Button
                    variant="contained"
                    onClick={handleClickOpen}
                    disabled={!too.tooid}
                >
                    Validate ToO Request
                </Button>
            </Tooltip>
            <TooInterruptDialog
                open={open}
                interruptResult={interruptResult}
                onClose={handleClose}
            />
        </>
    );
}