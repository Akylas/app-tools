export function profile(nameFnOrTarget?: string | Function | object, fnOrKey?: Function | string | symbol, descriptor?: PropertyDescriptor, attrs?: any): any {
    return typeof nameFnOrTarget === 'function' ? nameFnOrTarget : fnOrKey;
}
export const time = (global.__time || Date.now) as () => number;

export function level() {
    return 0;
}

export function enable() {}
export function disable() {}
export function start() {}
export function trace() {}
export function stop() {}
export function dumpProfiles() {}
export function resetProfiles() {}
export function startCPUProfile() {}
export function stopCPUProfile() {}
export function isRunning() {
    return false;
}
export function uptime() {
    return 0;
}
