/**
 * 환경 관련 유틸리티
 */

import { app } from 'electron';

export const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
export const isProduction = !isDev;
export const isMac = process.platform === 'darwin';
export const isWindows = process.platform === 'win32';
export const isLinux = process.platform === 'linux';

