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
                    }
                ]
            };
            const response = await runtime.invokeService(service, $request);
            assert.deepEqual(response, {
                status: 200,
                headers: {},
                body: {
                    $request,
                    name: ['joe'],
                    foo: ['one', 'two'],
                    '*': 'echo',
                },
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
                    }
                ]
            };
            const response = await runtime.invokeService(service, $request, {
                MY_VAR: '$uper$ecret',
            });
            assert.deepEqual(response.body, '$uper$ecret');
        });

    });

    describe('basic routing', () => {

        const service: ServiceSpec = {
            routes: [
                {
                    method: RouteMethod.GET,
                    path: '/echo',
                    moduleRef: 'EchoRoute',
                },
                {
                    method: RouteMethod.POST,
                    path: '/echo',
                    moduleRef: 'EchoRoute',
                },
                {
                    method: RouteMethod.ANY,
                    path: '/*',
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
            const response = await runtime.invokeService(service, $request);
            assert.deepEqual(response, {
                status: 200,
                headers: {},
                body: {
                    $request,
                    name: ['joe'],
                    foo: ['one', 'two'],
                },
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
            const response = await runtime.invokeService(service, $request);
            assert.deepEqual(response, {
                status: 200,
                headers: {},
                body: {
                    $request,
                    foo: ['one', 'two'],
                    bar: [123, 345],
                    name: ['joe'],
                },
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
            const response = await runtime.invokeService(service, $request);
            assert.deepEqual(response, {
                status: 404,
                headers: {
                    'content-type': ['text/html'],
                },
                body: '<h1>Not found</h1>',
            });
        });

    });

    describe('before hooks', async () => {

        it('pass data in locals', async () => {
            const response = await runtime.invokeService({
                routes: [
                    {
                        method: RouteMethod.ANY,
                        path: '/*',
                        moduleRef: 'EchoRoute',
                        beforeHooks: [
                            { moduleRef: 'AuthMiddleware' },
                        ]
                    },
                ],
            }, {
                method: RequestMethod.GET,
                path: '/echo',
                headers: {
                    'authorization': ['secret'],
                    'x-user-id': ['joe'],
                },
                query: {},
                body: {},
            }, {
                AUTH_TOKEN: 'secret'
            });
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.authorized, true);
            assert.strictEqual(response.body.userId, 'joe');
            // Returned by echo
            assert.ok(response.body.$request != null);
            assert.strictEqual(response.body['*'], 'echo');
        });

        it('throws the error', async () => {
            const response = await runtime.invokeService({
                routes: [
                    {
                        method: RouteMethod.ANY,
                        path: '/*',
                        moduleRef: 'EchoRoute',
                        beforeHooks: [
                            { moduleRef: 'AuthMiddleware' },
                        ]
                    },
                ],
            }, {
                method: RequestMethod.GET,
                path: '/echo',
                headers: {
                    'x-user-id': ['joe'],
                },
                query: {},
                body: {},
            });
            assert.deepEqual(response, {
                status: 403,
                headers: {
                    'content-type': ['application/json'],
                },
                body: {
                    name: 'Error',
                    message: 'Access Denied',
                    details: undefined,
                },
            });
        });

    });

    describe('after hooks', async () => {

        it('overwrite the result', async () => {
            const response = await runtime.invokeService({
                routes: [
                    {
                        method: RouteMethod.ANY,
                        path: '/*',
                        moduleRef: 'EchoRoute',
                        afterHooks: [
                            { moduleRef: 'AuthMiddleware' },
                        ]
                    },
                ],
            }, {
                method: RequestMethod.GET,
                path: '/echo',
                headers: {
                    'authorization': ['secret'],
                    'x-user-id': ['joe'],
                },
                query: {},
                body: {},
            }, {
                AUTH_TOKEN: 'secret'
            });
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.authorized, true);
            assert.strictEqual(response.body.userId, 'joe');
            // No longer present
            assert.strictEqual(response.body.$request, undefined);
            assert.strictEqual(response.body['*'], undefined);
        });

    });

    describe('error hook', () => {

        it('handles errors', async () => {
            const response = await runtime.invokeService({
                routes: [
                    {
                        method: RouteMethod.ANY,
                        path: '/*',
                        moduleRef: 'EchoRoute',
                        beforeHooks: [
                            { moduleRef: 'AuthMiddleware' },
                        ],
                        errorHook: { moduleRef: 'ErrorHandler' },
                    },
                ],
            }, {
                method: RequestMethod.GET,
                path: '/echo',
                headers: {},
                query: {},
                body: {},
            });
            assert.strictEqual(response.status, 403);
            assert.strictEqual(response.body, 'Custom error: Access Denied');
        });

    });

});
