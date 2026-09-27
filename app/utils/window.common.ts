export const refreshRequestedEvent = 'refreshRequested';

export interface WindowOptions {
    minWidth?: number;
    minHeight?: number;
    startWidth?: number;
    startHeight?: number;
    // reopen the Mac Catalyst window at its last position and size, default true
    restoreWindowFrame?: boolean;
    // adds a Refresh (⌘R) command to the Mac Catalyst View menu, emitting refreshRequestedEvent on Application
    refreshMenuTitle?: string;
}
