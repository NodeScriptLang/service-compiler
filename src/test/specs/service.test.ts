import assert from 'assert';

import { RequestMethod, RequestSpec, RouteMethod, ServiceSpec } from '../../main/index.js';
import { runtime } from '../runtime.js';

describe('Service Compiler', () => {

    describe('basic routing', () => {

        const service: ServiceSpec = {
            routes: [
                {
                    method: RouteMethod.GET,
                    path: '/echo',
                    middleware: false,
                    priority: 0,
                    moduleRef: 'EchoRoute',
                },
                {
                    method: RouteMethod.POST,
                    path: '/echo',
                    middleware: false,
                    priority: 0,
                    moduleRef: 'EchoRoute',
                },
                {
                    method: RouteMethod.ANY,
                    path: '/*',
                    middleware: false,
                    priority: -1,
                    moduleRef: 'NotFoundRoute',
                },
            ],
        };

        it('GET /echo', async () => {
            const $request: RequestSpec = {
                method: RequestMethod.GET,
                path: '/echo',
                headers: {
                    'accept': ['application/json'],
                },
                query: {
                    name: ['joe'],
                    foo: ['one', 'two'],
                },
                body: {},
            };
            const res = await runtime.invokeService(service, $request);
            assert.deepStrictEqual(res, { $request });
        });

        it('POST /echo', async () => {
            const $request: RequestSpec = {
                method: RequestMethod.POST,
                path: '/echo',
                headers: {
                    'accept': ['application/json'],
                    'content-type': ['application/json'],
                },
                query: {
                    name: ['joe'],
                    foo: ['one', 'two'],
                },
                body: {
                    foo: 123,
                    bar: [123, 345],
                },
            };
            const res = await runtime.invokeService(service, $request);
            assert.deepStrictEqual(res, { $request });
        });

        it('default 404', async () => {
            const $request: RequestSpec = {
                method: RequestMethod.GET,
                path: '/something',
                headers: {},
                query: {},
                body: {},
            };
            const res = await runtime.invokeService(service, $request);
            assert.deepStrictEqual(res, {
                $response: {
                    status: 404,
                    headers: {
                        'content-type': ['text/html'],
                    },
                    body: '<h1>Not found</h1>',
                },
            });
        });

    });

    describe('middleware', async () => {

        const service: ServiceSpec = {
            routes: [
                {
                    method: RouteMethod.ANY,
                    path: '/*',
                    middleware: true,
                    priority: 1,
                    moduleRef: 'AuthMiddleware',
                },
                {
                    method: RouteMethod.ANY,
                    path: '/*',
                    middleware: false,
                    priority: 0,
                    moduleRef: 'EchoRoute',
                },
            ],
        };

        it('pass data along', async () => {
            const $request: RequestSpec = {
                method: RequestMethod.GET,
                path: '/echo',
                headers: {
                    'authorization': ['secret'],
                    'x-user-id': ['joe'],
                },
                query: {},
                body: {},
            };
            const res = await runtime.invokeService(service, $request);
            assert.deepStrictEqual(res, {
                $request,
                authorized: true,
                userId: 'joe',
            });
        });

        it('throw the error', async () => {
            const $request: RequestSpec = {
                method: RequestMethod.GET,
                path: '/echo',
                headers: {
                    'x-user-id': ['joe'],
                },
                query: {},
                body: {},
            };
            const res = await runtime.invokeService(service, $request);
            assert.deepStrictEqual(res, {
                $response: {
                    status: 403,
                    headers: {
                        'content-type': ['application/json'],
                    },
                    body: {
                        name: 'Error',
                        message: 'Access Denied',
                    },
                    attributes: {},
                }
            });
        });

    });

});
