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

    const onSubmit = () => {
        if (username === "test" && password === "test123") {
            window.localStorage.setItem("userId", "1");
            window.location.reload();
        }
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
        let challengeInfo = (await axios.post("http://localhost:80/v1/webauthn/passkeys/register/start", null, {
            headers
        })).data;

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

        await axios.post("http://localhost:80/v1/webauthn/passkeys/register/finish", publicKeyCredential, {
            headers
        })
    }

    const arrayBufferToBase64 = (buffer) => {
        const bytes = new Uint8Array(buffer);
        const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
        return btoa(binary);
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

export default App;
