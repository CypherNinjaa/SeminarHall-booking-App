// Type declarations for Supabase Edge Functions
// This file suppresses TypeScript errors during development

declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(url: string, key: string): any;
}

// Global Deno environment
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Request and Response are standard Web APIs
declare global {
  interface Request {
    method: string;
    headers: Headers;
    json(): Promise<any>;
  }
  
  interface Response {
    ok: boolean;
    status: number;
    headers: Headers;
    json(): Promise<any>;
  }
  
  interface Headers {
    get(name: string): string | null;
  }
  
  const Response: {
    new(body?: BodyInit | null, init?: ResponseInit): Response;
  };
  
  const fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export {};
