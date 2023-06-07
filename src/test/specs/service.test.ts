import { RequestMethod, RequestSpec } from '@nodescript/core/schema';
import assert from 'assert';

import { RouteMethod, ServiceSpec } from '../../main/index.js';
import { runtime } from '../runtime.js';

describe('Service Compiler', () => {

    describe('single endpoint', () => {

        it('works', async () => {
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
            const service: ServiceSpec = {
                routes: [
                    {
                        method: RouteMethod.ANY,
                        path: '/*',
                        moduleRef: 'EchoRoute',
                        middleware: [],
                    }
                ]
            };
            const { res } = await runtime.invokeService(service, $request);
            assert.deepEqual(res, {
                $response: {
                    status: 200,
                    attributes: {},
                    headers: {
                        'content-type': ['application/json'],
                    },
                    body: JSON.stringify({
                        $request,
                        name: ['joe'],
                        foo: ['one', 'two'],
                        '*': 'echo',
                    }),
                }
            });
        });

        it('supports variables', async () => {
            const $request: RequestSpec = {
                method: RequestMethod.GET,
                path: '/variable',
                headers: {
                    'accept': ['application/json'],
                },
                query: {},
                body: {},
            };
            const service: ServiceSpec = {
                routes: [
                    {
                        method: RouteMethod.ANY,
                        path: '/variable',
                        moduleRef: 'VariableEcho',
                        middleware: [],
                    }
                ]
            };
            const { res } = await runtime.invokeService(service, $request, {
                MY_VAR: '$uper$ecret',
            });
            assert.deepEqual(res.$response.body, '$uper$ecret');
        });

    });

    describe('basic routing', () => {

        const service: ServiceSpec = {
            routes: [
                {
                    method: RouteMethod.GET,
                    path: '/echo',
                    moduleRef: 'EchoRoute',
                    middleware: [],
                },
                {
                    method: RouteMethod.POST,
                    path: '/echo',
                    moduleRef: 'EchoRoute',
                    middleware: [],
                },
                {
                    method: RouteMethod.ANY,
                    path: '/*',
                    moduleRef: 'NotFoundRoute',
                    middleware: [],
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
            const { res } = await runtime.invokeService(service, $request);
            assert.deepEqual(res, {
                $response: {
                    status: 200,
                    attributes: {},
                    headers: {
                        'content-type': ['application/json'],
                    },
                    body: JSON.stringify({
                        $request,
                        name: ['joe'],
                        foo: ['one', 'two'],
                    }),
                }
            });
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
            const { res } = await runtime.invokeService(service, $request);
            assert.deepEqual(res, {
                $response: {
                    status: 200,
                    attributes: {},
                    headers: {
                        'content-type': ['application/json'],
                    },
                    body: JSON.stringify({
                        $request,
                        foo: ['one', 'two'],
                        bar: [123, 345],
                        name: ['joe'],
                    }),
                }
            });
        });

        it('default 404', async () => {
            const $request: RequestSpec = {
                method: RequestMethod.GET,
                path: '/something',
                headers: {},
                query: {},
                body: {},
            };
            const { res } = await runtime.invokeService(service, $request);
            assert.deepEqual(res, {
                $response: {
                    status: 404,
                    headers: {
                        'content-type': ['text/html'],
                    },
                    body: '<h1>Not found</h1>',
                    attributes: {},
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
                    moduleRef: 'EchoRoute',
                    middleware: [
                        { moduleRef: 'AuthMiddleware' },
                    ]
                },
            ],
        };

        it('pass data in locals', async () => {
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
            const { res, ctx } = await runtime.invokeService(service, $request);
            assert.strictEqual(ctx.getLocal('authorized'), true);
            assert.strictEqual(ctx.getLocal('userId'), 'joe');
            assert.deepEqual(res, {
                $response: {
                    status: 200,
                    headers: {
                        'content-type': ['application/json'],
                    },
                    body: JSON.stringify({
                        $request,
                        '*': 'echo',
                    }),
                    attributes: {},
                },
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
            const { res } = await runtime.invokeService(service, $request);
            assert.deepEqual(res, {
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
