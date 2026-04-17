/// <reference types="svelte" />
/// <reference types="vite/client" />

declare namespace svelteHTML {
	interface HTMLAttributes<T> {
		onconsider?: (event: CustomEvent<{ items: unknown[]; info: unknown }> & { target: EventTarget & T }) => void;
		onfinalize?: (event: CustomEvent<{ items: unknown[]; info: unknown }> & { target: EventTarget & T }) => void;
	}
}

declare module 'svelte/elements' {
	interface DOMAttributes<T extends EventTarget> {
		onconsider?: (event: CustomEvent<{ items: unknown[]; info: unknown }> & { target: EventTarget & T }) => void;
		onfinalize?: (event: CustomEvent<{ items: unknown[]; info: unknown }> & { target: EventTarget & T }) => void;
	}
}
