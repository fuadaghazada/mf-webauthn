import './App.css';
import {useEffect, useState} from "react";
import axios from "axios";

function App() {
    const [isAuth, setAuth] = useState(false);

    useEffect(() => {
        let userId = window.localStorage.getItem("userId");
        if (userId != null) {
            setAuth(true);
        }
    }, []);

    return (
        <div className="App">
            {!isAuth ? <LoginComponent/> : <HomePage/>}
        </div>
    );
}

function LoginComponent() {
    const [username, setUsername] = useState(null);
    const [password, setPassword] = useState(null);

    const onSubmit = async () => {
        if (username != null && password === null) {
            await authPasskey();

        } else if (username === "mock_user_name" && password === "test123") {
            login();
        }
    }

    const authPasskey = async () => {
        let resp = await axios.post("http://localhost:8080/public/v1/passkeys/auth/begin", {
            username
        });
        let publicKey = resp.data;

        let sessionId = resp.headers['dp-session-id']

        console.log(publicKey);

        let credential = await window.navigator.credentials.get({
            ...publicKey,
            publicKey: {
                ...publicKey.publicKey,
                challenge: base64ToArrayBuffer(publicKey.publicKey.challenge),
                allowCredentials: publicKey.publicKey.allowCredentials.map(ac =>
                    ({
                        ...ac,
                        id: base64ToArrayBuffer(ac.id)
                    })
                )
            }
        });

        console.log(credential);

        const publicKeyCredential = {
            type: credential.type,
            id: credential.id,
            rawId: arrayBufferToBase64(credential.rawId),
            response: {
                authenticatorData: arrayBufferToBase64(credential.response.authenticatorData),
                clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON),
                signature: arrayBufferToBase64(credential.response.signature),
                userHandle: arrayBufferToBase64(credential.response.userHandle),
            },
        };

        console.log(publicKeyCredential)

        let headers = {'DP-Session-ID': sessionId};

        let accessToken = (await axios.post("http://localhost:8080/public/v1/passkeys/auth/finish", {
            username,
            credentials: publicKeyCredential
        }, {headers})).data;

        console.log(accessToken)

        login()
    }

    const login = () => {
        window.localStorage.setItem("userId", "41");
        window.location.reload();
    }

    return <div className="Main">
        <input type="text" placeholder={"Username"} onChange={e => setUsername(e.target.value)}/>
        <br/>
        <input type="password" placeholder={"Password"} onChange={e => setPassword(e.target.value)}/>
        <br/>
        <button onClick={onSubmit}>Login</button>
    </div>
}

function HomePage() {
    const registerPasskey = async () => {
        let userId = window.localStorage.getItem("userId");
        let headers = {"DP-User-ID": userId};
        let resp = (await axios.get("http://localhost:8080/v1/passkeys/registration/begin", {
            headers
        }));
        let challengeInfo = resp.data;
        let sessionId = resp.headers['dp-session-id']

        console.log("Session ID:", sessionId, resp.headers)
        console.log("Challenge response:", challengeInfo)

        let challenge = {
            ...challengeInfo,
            publicKey: {
                ...challengeInfo["publicKey"],
                challenge: base64ToArrayBuffer(challengeInfo["publicKey"]["challenge"]),
                user: {
                    ...challengeInfo["publicKey"]["user"],
                    id: base64ToArrayBuffer(challengeInfo["publicKey"]["user"]["id"])
                }
            }
        }

        console.log("Challenge:", challenge)

        let credentials = await navigator.credentials.create(challenge);

        const publicKeyCredential = {
            type: credentials.type,
            id: credentials.id,
            rawId: arrayBufferToBase64(credentials.rawId),
            response: {
                attestationObject: arrayBufferToBase64(credentials.response.attestationObject),
                clientDataJSON: arrayBufferToBase64(credentials.response.clientDataJSON),
            },
        };

        console.log("Public key credentials payload:", publicKeyCredential)

        headers['DP-Session-ID'] = sessionId;
        await axios.post("http://localhost:8080/v1/passkeys/registration/finish", publicKeyCredential, {
            headers
        })
    }

    const logout = () => {
        window.localStorage.clear();
        window.location.reload();
    }

    return <div className="Main">
        <p>You are in Home page</p>
        <button onClick={registerPasskey}>Register Passkey</button>
        <br/>
        <button onClick={logout}>Logout</button>
    </div>
}

const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_');;
}

const base64ToArrayBuffer = (base64UrlSafe) => {
    const base64 = base64UrlSafe.replace(/-/g, '+').replace(/_/g, '/');

    const binaryString = atob(base64);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }

    return uint8Array;
}

export default App;
