import { describe, it, beforeAll, afterAll } from 'vitest';
import { server } from '../../../mocks/server';
import { fetch as crossFetch, Response, Request, Headers } from 'cross-fetch';

describe('Debug MSW Headers', () => {
    beforeAll(() => {
        global.fetch = crossFetch;
        global.Response = Response;
        global.Request = Request;
        global.Headers = Headers;
        server.listen({ onUnhandledRequest: 'warn' });
    });

    afterAll(() => {
        server.close();
    });

    it('logs response headers', async () => {
        const response = await fetch('http://localhost/StudentDataMining/backend/api/grades.php?user_id=10', {
            headers: { 'Authorization': 'Bearer fake' }
        });
        console.log("STATUS:", response.status);
        const ct = response.headers.get('content-type');
        console.log("CONTENT-TYPE:", ct);
        console.log("HEADERS:", Array.from(response.headers.entries()));
        console.log("BODY:", await response.text());
    });
});
