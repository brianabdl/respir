import { configureEcho, echoIsConfigured } from '@laravel/echo-react';

export function initEcho(): void {
    if (typeof window === 'undefined' || echoIsConfigured()) {
        return;
    }

    configureEcho({ broadcaster: 'reverb' });
}
