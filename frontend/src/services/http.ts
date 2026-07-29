import axios from 'axios';
import { env } from '../lib/env';

export const http = axios.create({ baseURL: env.apiUrl, timeout: 15_000 });

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(error),
);
