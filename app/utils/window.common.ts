export const refreshRequestedEvent = 'refreshRequested';
export const windowCommandEvent = 'windowCommand';

export interface WindowCommand {
    id: string;
    title: string;
    // key equivalent, used with the Command modifier
    input: string;
    // the Mac Catalyst menu the command is inserted in, `edit` replaces the system Find entries, `preferences` the system Settings entry
    menu: 'edit' | 'view' | 'preferences';
}

export interface WindowOptions {
    minWidth?: number;
    minHeight?: number;
    startWidth?: number;
    startHeight?: number;
    // reopen the Mac Catalyst window at its last position and size, default true
    restoreWindowFrame?: boolean;
    // adds a Refresh (⌘R) command to the Mac Catalyst View menu, emitting refreshRequestedEvent on Application
    refreshMenuTitle?: string;
    // menu bar commands, emitting windowCommandEvent (`commandId`) on Application
    commands?: WindowCommand[];
}
