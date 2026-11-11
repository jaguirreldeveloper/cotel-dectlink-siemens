/**
 * Type declarations for Service Worker environment
 */

interface ServiceWorkerGlobalScope {
  // Service Worker APIs
  skipWaiting: () => Promise<void>;
  clients: Clients;
  
  // Events
  addEventListener: (
    type: 'install' | 'activate' | 'fetch' | 'message' | 'online' | 'offline',
    listener: (event: Event) => void,
    options?: AddEventListenerOptions
  ) => void;
  
  // Fetch
  fetch: typeof fetch;
  
  // Caches
  caches: CacheStorage;
  
  // Registration
  registration: ServiceWorkerRegistration;
}

interface ExtendableEvent extends Event {
  waitUntil: (promise: Promise<any>) => void;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith: (response: Response | Promise<Response>) => Promise<Response>;
}

interface MessageEvent extends ExtendableEvent {
  data: any;
  source: (MessageEventSource | null);
}

interface ExtendableMessageEvent extends ExtendableEvent {
  data: any;
  source: (MessageEventSource | null);
}

interface Clients {
  matchAll: (options?: ClientQueryOptions) => Promise<Client[]>;
  get: (id: string) => Promise<Client | undefined>;
  claim: () => Promise<void>;
  openWindow: (url: string) => Promise<WindowClient | null>;
}

interface WindowClient extends Client {
  postMessage: (message: any, targetOrigin?: string) => void;
  focus: () => void;
  navigate: (url: string) => Promise<WindowClient | null>;
}

// Declare self for Service Worker
declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// Declare navigator.serviceWorker for window
interface Navigator {
  serviceWorker: ServiceWorkerContainer;
}

interface ServiceWorkerContainer {
  register: (scriptURL: string, options?: RegistrationOptions) => Promise<ServiceWorkerRegistration>;
  addEventListener: (
    type: 'controllerchange' | 'message' | 'error',
    listener: (event: Event) => void,
    options?: AddEventListenerOptions
  ) => void;
}

interface ServiceWorkerRegistration {
  scope: string;
  update: () => Promise<void>;
  unregister: () => Promise<boolean>;
  addEventListener: (
    type: 'updatefound',
    listener: (event: Event) => void,
    options?: AddEventListenerOptions
  ) => void;
}

interface CacheStorage {
  match: (request: Request | string, options?: CacheQueryOptions) => Promise<Response | undefined>;
  has: (cacheName: string) => Promise<boolean>;
  open: (cacheName: string) => Promise<Cache>;
  delete: (cacheName: string) => Promise<boolean>;
  keys: () => Promise<string[]>;
}

interface Cache {
  match: (request: Request | string, options?: CacheQueryOptions) => Promise<Response | undefined>;
  matchAll: (request: Request | string, options?: CacheQueryOptions) => Promise<Response[]>;
  add: (request: Request) => Promise<void>;
  addAll: (requests: Request[]) => Promise<void>;
  put: (request: Request, response: Response) => Promise<void>;
  delete: (request: Request, options?: CacheQueryOptions) => Promise<boolean>;
  keys: () => Promise<Request[]>;
  entries: () => Promise<[Request, Response][]>;
}

// Polyfill for Service Worker global scope
interface GlobalEventHandlers {
  oninstall: ((this: GlobalEventHandlers, ev: ExtendableEvent) => any) | null;
  onactivate: ((this: GlobalEventHandlers, ev: ExtendableEvent) => any) | null;
  onfetch: ((this: GlobalEventHandlers, ev: FetchEvent) => any) | null;
  onmessage: ((this: GlobalEventHandlers, ev: ExtendableMessageEvent) => any) | null;
  ononline: ((this: GlobalEventHandlers, ev: Event) => any) | null;
  onoffline: ((this: GlobalEventHandlers, ev: Event) => any) | null;
}
