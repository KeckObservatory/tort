import { Button, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { StyledPaper } from './App'
import { TOM_API } from './config'

interface LoginPanelProps {
    setUserInfo?: (userinfo: any) => void
}

export const LoginPanel = (props: LoginPanelProps) => {

    const { setUserInfo } = props

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [token, setToken] = useState('')
    const [needsToken, setNeedsToken] = useState(false)

    const handleTokenVerification = async () => {
        console.log('Verifying token:', token)
        const tokenParams = { email, token }
        const tokenResp = await fetch(`${TOM_API}/keck_verify_token/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tokenParams),
        })
        // Handle token verification failure
        if (!tokenResp.ok) {
            console.error('Token verification failed:', tokenResp.statusText)
            console.error(await tokenResp.json())
            return
        }
        setNeedsToken(false)
        console.log('Token verified successfully.')
    }

    const handleLogin = async () => {

        if (needsToken) {
            await handleTokenVerification()
            return
        }

        console.log('Logging in with:', { email, password })
        const loginParams = { email, password }
        //@ts-ignore
        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        const loginResp = await fetch(`${TOM_API}/keck_login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
            body: JSON.stringify(loginParams),
        })
        // Handle Token verification
        console.log('Login response:', loginResp.status, loginResp.statusText)
        if (loginResp.status === 401) {
            const resp = await loginResp.json()
            if (resp.includes('Verification token required')) {
                console.log('Verification token required. Please check your email.')
                setNeedsToken(true)
            }
        }
        // Handle login failure
        if (!loginResp.ok) {
            console.error('Login failed:', loginResp.statusText)
            console.error(await loginResp.json())
            return
        }
        const apicookies = await loginResp.json()
        const uid = apicookies['py_uid']
        setTimeout(async () => { //give the auth server some time to set things.
            console.log('Setting user info with UID:', uid)
            const userinfoResp = await fetch(`${TOM_API}/keck_get_userinfo/?uid=${uid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            })
            if (!userinfoResp.ok) {
                console.error('Failed to retrieve user information:', userinfoResp.statusText)
                console.error(await userinfoResp.json())
                return
            }
            setUserInfo && setUserInfo(await userinfoResp.json())
            console.log('User information retrieved successfully.')
            // Handle login logic here, e.g., send a request to the server
        }, 100)
    }

    return (
        <StyledPaper>
            <h2>Login</h2>

            <Stack spacing={2} sx={{ padding: '16px', maxWidth: '400px', margin: 'auto' }} direction={'column'}>
                <TextField
                    required
                    id="user-email"
                    label="Email"
                    defaultValue=""
                    onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                    id="user-password"
                    required
                    label="Password"
                    type="password"
                    onChange={(e) => setPassword(e.target.value)}
                />
                {needsToken && (
                    <TextField
                        id="verification-token"
                        label="Verification Token"
                        type="text"
                        helperText="Please check your email for the verification token. Select 'Login' button after entering the token."
                        onChange={(e) => setToken(e.target.value)}
                    />
                )}
                <Button
                    variant="contained"
                    onClick={handleLogin}
                >
                    Login
                </Button>
            </Stack>
        </StyledPaper>
    )
}