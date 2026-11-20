import { AdmobTauriException } from './bridge.js';
import type { PluginListenerHandle } from './capacitor.js';
export type { PluginListenerHandle };
type ListenerCallback = (err: any, ...args: any[]) => void;
export declare class WebPlugin {
    protected listeners: {
        [eventName: string]: ListenerCallback[];
    };
    protected retainedEventArguments: {
        [eventName: string]: any[];
    };
    addListener(eventName: string, listenerFunc: ListenerCallback): Promise<PluginListenerHandle>;
    removeAllListeners(): Promise<void>;
    protected notifyListeners(eventName: string, data: any, retainUntilConsumed?: boolean): void;
    protected hasListeners(eventName: string): boolean;
    protected unimplemented(msg?: string): AdmobTauriException;
    protected unavailable(msg?: string): AdmobTauriException;
    private removeListener;
    private sendRetainedArgumentsForEvent;
}
