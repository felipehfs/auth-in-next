import axios, { AxiosError } from 'axios';
import Router  from 'next/router';
import { parseCookies, setCookie, destroyCookie } from 'nookies'
import { AuthTokenError } from './errors/AuthTokenError';

let isRefreshing = false;
let failedRequestsQueue = [];

export function setupAPIClient(ctx = undefined) {
    let cookies = parseCookies(ctx);

    const api = axios.create({
        baseURL: 'http://localhost:3333',
        headers: {
            Authorization: `Bearer ${cookies['nextauth.token']}`
        }
    });

    api.interceptors.response.use(response => response, (error: AxiosError) => {
        if (error.response?.status === 401) {
            if (error.response.data?.code === 'token.expired') {
                cookies = parseCookies(ctx);
    
                const { 'nextauth.refreshToken': refreshToken } = cookies;
                const originalConfig = error.config;
    
    
                if (!isRefreshing) {
                    isRefreshing = true;
    
                        api.post('/refresh', {
                            refreshToken
                        }).then(response => {
                            if(!response?.data) return;
                            const { token } = response.data;
    
                            setCookie(ctx, 'nextauth.token', token, {
                                maxAge: 60 * 60 * 24 * 30, // 30 dias
                                path: '/'
                            });
                
                            setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, {
                                maxAge: 60 * 60 * 24 * 30,
                                path: '/'
                            });
    
                            api.defaults.headers['Authorization'] = `Bearer ${token}`;
    
                            failedRequestsQueue.forEach(request => request.onSuccess(token));
                            failedRequestsQueue = [];
                        }).catch(err => {
                            failedRequestsQueue.forEach(request => request.onFailure(err));
                            failedRequestsQueue = [];
                        }).finally(() => {
                            isRefreshing = false;
                        });
                } 
                return new Promise((resolve, reject) => {
                    failedRequestsQueue.push({
                        onSuccess: (token: string) => {
                            originalConfig.headers['Authorization'] = `Bearer ${token}`;
    
                            resolve(api(originalConfig));
                        },
                        onFailure: (err: AxiosError) => {
                            reject(err);
                        },
                    })
                });
            } else {
                if(process.browser) {
                    signOut(ctx);
                } else {
                    return Promise.reject(new AuthTokenError())
                }
            }
    
            return Promise.reject(error)
        }
    });

    return api;
}



export function signOut(ctx = undefined) {
    destroyCookie(ctx, 'nextauth.token');
    destroyCookie(ctx, 'nextauth.refreshToken');
    Router.push('/')
}

