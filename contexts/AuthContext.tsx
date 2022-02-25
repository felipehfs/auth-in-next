import Router, { useRouter } from "next/router";
import { createContext, ReactNode, useEffect, useState } from "react";
import { api } from "../services/apiClient";
import { setCookie, parseCookies, destroyCookie } from "nookies";

type User = {
    email: string;
    permissions: string[]; 
    roles: string[];
}

type SignInCredentials = {
    email: string;
    password: string;
}

type AuthContextData = {
    signIn: (credentials: SignInCredentials) => Promise<void>;
    signOut: () => void;
    user: User;
    isAuthenticated: boolean;
};


export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

let authChannel: BroadcastChannel; 

export function signOut() {
    destroyCookie(undefined, 'nextauth.token');
    destroyCookie(undefined, 'nextauth.refreshToken');

    authChannel.postMessage('signOut');
    Router.push('/')
}


type AuthProviderProps = {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const router = useRouter();
    const [user, setUser] = useState<User>()
    const isAuthenticated = !!user;

    useEffect(() => {
        authChannel = new BroadcastChannel('auth');
        authChannel.onmessage = (message) => {
            switch(message.data) {
                case 'signOut':
                    signOut();
                    break;
                case 'signIn':
                    Router.push('/dashboard');
                default:
                    break;
            }
        }
    }, [])

    useEffect(() => {
        const { 'nextauth.token': token} = parseCookies();

        if (token) {
            api.get('/me').then(response => {
                const { email, permissions, roles } = response.data;
                setUser({ email, permissions, roles });
            }).catch(() => {
                signOut();
            });
        }
    },[])

    async function signIn({ email, password }: SignInCredentials) {
        try {
            const response = await api.post('sessions', { email, password });
            
            const { token, permissions, roles, refreshToken } = response.data;

            setCookie(undefined, 'nextauth.token', token, {
                maxAge: 60 * 60 * 24 * 30, // 30 dias
                path: '/'
            });

            setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
                maxAge: 60 * 60 * 24 * 30,
                path: '/'
            });

            setUser({ email, permissions, roles });

            api.defaults.headers["Authorization"] = `Bearer ${token}`;
            
            router.push('/dashboard');
            authChannel.postMessage('signIn');
        } catch (err) {
            console.log(err);
        }

    }


    return (
        <AuthContext.Provider value={{ signIn, user, signOut, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    )
}