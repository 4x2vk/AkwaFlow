import { useCallback, useEffect, useMemo, useState } from 'react';
import { BUILD_ID } from './buildInfo';

const VERSION_URL = '/version.json';
const POLL_INTERVAL_MS = 60_000;

async function fetchRemoteBuildInfo() {
    const url = new URL(VERSION_URL, window.location.origin);
    url.searchParams.set('_ts', String(Date.now()));

    const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: {
            'cache-control': 'no-cache'
        }
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch version.json (${res.status})`);
    }
    return await res.json();
}

async function clearCachesAndReload() {
    // Best-effort: unregister service workers (if any)
    try {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
        }
    } catch {
        // ignore
    }

    // Best-effort: clear Cache Storage (if any)
    try {
        if ('caches' in window) {
            const keys = await window.caches.keys();
            await Promise.all(keys.map((k) => window.caches.delete(k)));
        }
    } catch {
        // ignore
    }

    // Hard reload with cache-busting query param
    const url = new URL(window.location.href);
    url.searchParams.set('v', String(Date.now()));
    window.location.replace(url.toString());
}

export function useAppUpdate() {
    const [remoteInfo, setRemoteInfo] = useState(null);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    const localBuildId = BUILD_ID;

    const checkForUpdate = useCallback(async () => {
        try {
            const info = await fetchRemoteBuildInfo();
            setRemoteInfo(info);
            if (info?.buildId && info.buildId !== localBuildId) {
                setUpdateAvailable(true);
            }
        } catch {
            // silent: offline / temporary hosting issues
        }
    }, [localBuildId]);

    useEffect(() => {
        // Initial check (deferred to avoid expensive effect warnings)
        const initialId = window.setTimeout(checkForUpdate, 0);

        // Polling
        const id = window.setInterval(checkForUpdate, POLL_INTERVAL_MS);

        // Also re-check when app becomes visible again
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                checkForUpdate();
            }
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.clearTimeout(initialId);
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [checkForUpdate]);

    const applyUpdate = useCallback(async () => {
        await clearCachesAndReload();
    }, []);

    const infoText = useMemo(() => {
        if (!remoteInfo?.buildTime) return null;
        const d = new Date(remoteInfo.buildTime);
        if (isNaN(d.getTime())) return null;
        return `Новая версия от ${d.toLocaleString('ru-RU')}`;
    }, [remoteInfo]);

    return {
        updateAvailable,
        infoText,
        checkForUpdate,
        applyUpdate
    };
}

