import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Construct a basic Headers polyfill if missing
if (!global.Headers) {
    global.Headers = class Headers {
        constructor() {
            this.data = {};
        }
        append(name, value) {
            this.data[name] = value;
        }
        get(name) {
            return this.data[name] || null;
        }
    };
}

// Mock localStorage
const localStorageMock = (function () {
    let store = {};
    return {
        getItem: function (key) {
            return store[key] || null;
        },
        setItem: function (key, value) {
            store[key] = value.toString();
        },
        removeItem: function (key) {
            delete store[key];
        },
        clear: function () {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock console.error to avoid decluttering test output
const originalError = console.error;
console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
        return;
    }
    originalError.call(console, ...args);
};

// Mock Response for fetch
global.Response = class Response {
    constructor(body, init) {
        this.body = body;
        this.status = init?.status || 200;
        this.ok = this.status >= 200 && this.status < 300;
        this.statusText = init?.statusText || 'OK';
        this.headers = new Headers(init?.headers);
    }
    json() {
        return Promise.resolve(this.body); // Assume body is already object/array for mocked responses, or parse if string
    }
    text() {
        return Promise.resolve(JSON.stringify(this.body));
    }
    clone() {
        return new Response(this.body, { status: this.status, statusText: this.statusText, headers: this.headers });
    }
};

global.fetch = jest.fn();
