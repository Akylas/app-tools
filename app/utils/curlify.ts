import { File } from '@nativescript/core';
import type { HttpsFormDataParam, HttpsRequestOptions } from '@nativescript-community/https/request';

function shellEscape(s: any): string {
    if (s === undefined || s === null) return "''";
    const str = String(s);
    // replace single quote by: '"'"' -> safe inside single quoted string in shell
    return `'${str.replace(/'/g, "'\"'\"'")}'`;
}

function buildQueryString(params: Record<string, any> | undefined): string {
    if (!params) return '';
    const parts: string[] = [];
    for (const k of Object.keys(params)) {
        const v = params[k];
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
            for (const item of v) {
                parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`);
            }
        } else if (typeof v === 'object') {
            parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(JSON.stringify(v))}`);
        } else {
            parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
        }
    }
    return parts.length ? `?${parts.join('&')}` : '';
}

function formParamToCurl(part: HttpsFormDataParam): string {
    const name = part.parameterName;
    const data = part.data;
    // File
    if (data && typeof data === 'object' && 'path' in data) {
        const file = data as File & { path?: string; name?: string };
        const path = file.path || (file as any).nativePath || '';
        let fld = `${name}=@${path}`;
        if (part.fileName) fld += `;filename=${part.fileName}`;
        if (part.contentType) fld += `;type=${part.contentType}`;
        return `-F ${shellEscape(fld)}`;
    }
    // other value
    return `-F ${shellEscape(`${name}=${data}`)}`;
}

export function optionsToCurl(url, options: HttpsRequestOptions & { queryParams?: any }): string {
    const method = (options.method || 'GET').toUpperCase();
    // append params to url if provided
    if (options.queryParams) {
        url = `${url}${buildQueryString(options.queryParams)}`;
    }
    const parts: string[] = ['curl', '-i']; // include response headers for convenience

    // timeout (seconds): curl uses --max-time
    if (options.timeout) parts.push(`--max-time ${Number(options.timeout)}`);

    // method
    if (method && method !== 'GET') parts.push('-X', shellEscape(method));

    // headers
    if (options.headers) {
        for (const k of Object.keys(options.headers)) {
            const v = options.headers[k];
            parts.push('-H', shellEscape(`${k}: ${v}`));
        }
    }

    // body handling
    if (Array.isArray(options.body)) {
        // form-data array
        for (const p of options.body) {
            parts.push(formParamToCurl(p));
        }
    } else if (options.body && typeof options.body === 'object' && 'path' in options.body) {
        // single File
        const file = options.body as File & { path?: string; name?: string };
        const path = file.path || (file as any).nativePath || '';
        // default multipart form with "file" field name if none specified
        parts.push('-F', shellEscape(`file=@${path}`));
    } else if (options.body !== undefined) {
        // assume JSON or raw
        let payload: string;
        if (typeof options.body === 'string') {
            payload = options.body;
        } else {
            try {
                payload = JSON.stringify(options.body);
            } catch {
                payload = String(options.body);
            }
        }
        // add content-type header if not present
        if (!options.headers || !Object.keys(options.headers).some((h) => h.toLowerCase() === 'content-type')) {
            parts.push('-H', shellEscape('Content-Type: application/json'));
        }
        parts.push('-d', shellEscape(payload));
    } else if (options.content !== undefined) {
        // native content passed
        parts.push('-d', shellEscape(String(options.content)));
    }

    parts.push(shellEscape(url));
    return parts.join(' ');
}

export function logRequestAsCurl(url: string, options: HttpsRequestOptions & { queryParams?: any }): void {
    try {
        const curl = optionsToCurl(url, options);
        DEV_LOG && console.log(curl);
    } catch (e) {
        console.warn('Failed to build curl string', e);
    }
}
