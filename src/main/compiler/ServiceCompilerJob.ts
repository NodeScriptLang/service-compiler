import { CodeBuilder, SymTable } from '@nodescript/core/compiler';
import { ModuleLoader } from '@nodescript/core/runtime';
import { ResponseSpecSchema } from '@nodescript/core/schema';
import { ModuleSpec, SchemaSpec } from '@nodescript/core/types';

import { RouteSpec } from '../schema/RouteSpec.js';
import { ServiceSpec } from '../schema/ServiceSpec.js';

export class ServiceCompilerJob {

    private done = false;
    private code = new CodeBuilder();
    private symtable = new SymTable();

    constructor(
        readonly loader: ModuleLoader,
        readonly serviceSpec: ServiceSpec,
    ) {}

    run() {
        if (this.done) {
            return;
        }
        this.emitModuleImports();
        this.emitUtilities();
        this.emitCompute();
        this.done = true;
    }

    getEmittedCode() {
        return this.code.toString();
    }

    private emitModuleImports() {
        for (const route of this.serviceSpec.routes) {
            this.emitModuleImport(route.moduleRef);
            for (const mw of route.middleware) {
                this.emitModuleImport(mw.moduleRef);
            }
        }
    }

    private emitModuleImport(moduleRef: string) {
        const computeUrl = this.loader.resolveComputeUrl(moduleRef);
        const key = `module:${moduleRef}`;
        let sym = this.symtable.get(key, '');
        if (!sym) {
            sym = this.symtable.nextSym('m');
            this.symtable.set(key, sym);
            this.code.line(`import { compute as ${sym} } from '${computeUrl}';`);
        }
    }

    private emitCompute() {
        this.code.block('export async function compute(params, ctx) {', '}', () => {
            this.code.line(`const $request = params.$request`);
            this.code.line(`const $variables = params.$variables ?? Object.create(null)`);
            this.code.line(`ctx.setLocal('$responseHeaders', {});`);
            for (const route of this.serviceSpec.routes) {
                this.emitRoute(route);
            }
            this.code.line(`return processError(ctx, { status: 404, name: 'RouteNotFoundError', message: 'Route not found' })`);
        });
    }

    private emitRoute(route: RouteSpec) {
        this.code.line(`// ${route.method} ${route.path} - ${route.moduleRef}`);
        // Match method
        const condition = route.method === '*' ? `true` : `$request.method === ${JSON.stringify(route.method)}`;
        this.code.block(`if (${condition}) {`, `}`, () => {
            // Match path
            this.code.line(`const pathParams = ctx.lib.matchPath(${JSON.stringify(route.path)}, $request.path);`);
            this.code.block(`if (pathParams != null) {`, `}`, () => {
                if (route.routeId) {
                    this.code.line(`ctx.setLocal('$routeId', ${JSON.stringify(route.routeId)})`);
                }
                for (const mw of route.middleware) {
                    this.emitMiddlewareHandler(mw.moduleRef);
                }
                this.emitRouteHandler(route);
            });
        });
    }

    private emitMiddlewareHandler(moduleRef: string) {
        this.code.line(`// Middleware ${moduleRef}`);
        this.code.block(`try {`, `}`, () => {
            this.emitHandlerCompute(moduleRef);
            // If middleware returns an object with $response, stop processing and return it
            this.code.block(`if ($r && typeof $r === 'object') {`, `}`, () => {
                this.code.block(`if ($r.$response) {`, `}`, () => {
                    this.code.line('return processResponse(ctx, $r);');
                });
            });
        });
        this.code.block(`catch (error) {`, `}`, () => {
            // If the middleware throws, convert the error into response and return it
            this.code.line(`return processError(ctx, error)`);
        });
    }

    private emitRouteHandler(route: RouteSpec) {
        this.code.line(`// Route handler`);
        this.code.block(`try {`, `}`, () => {
            this.emitHandlerCompute(route.moduleRef);
            this.code.line(`return processResponse(ctx, $r)`);
        });
        this.code.block(`catch (error) {`, `}`, () => {
            // If the route throws, convert the error into response and return it
            this.code.line(`return processError(ctx, error)`);
        });
    }

    private emitHandlerCompute(moduleRef: string) {
        const module = this.loader.resolveModule(moduleRef);
        const paramsSchema = this.getParamsSchema(module);
        const sym = this.symtable.get(`module:${moduleRef}`);
        const variableEntries = this.getVariableEntries(module);
        this.code.line(`let $p = ctx.convertType({
                $request,
                ...$request.body,
                ...$request.query,
                ...pathParams,
                ${variableEntries.join(',')}
            }, ${JSON.stringify(paramsSchema)})`);
        this.code.line(`const $r = await ${sym}($p, ctx);`);
    }

    private getVariableEntries(module: ModuleSpec) {
        const entries: string[] = [];
        for (const [paramKey, paramSpec] of Object.entries(module.params)) {
            const variableKey = paramSpec.attributes.variableKey;
            if (!variableKey) {
                continue;
            }
            entries.push(`${JSON.stringify(paramKey)}: $variables[${JSON.stringify(variableKey)}]`);
        }
        return entries;
    }

    private emitUtilities() {
        this.code.line(`
        function processError(ctx, error) {
            const $response = {
                status: Number(error.status) || 500,
                headers: {
                    'content-type': ['application/json'],
                },
                body: {
                    name: error.name,
                    message: error.message,
                },
                attributes: {},
            };
            return { $response };
        }
        `);
        this.code.line(`
        function processResponse(ctx, value) {
            // Empty body
            if (value == null) {
                return {
                    $response: {
                        status: 204,
                        headers: ctx.getLocal('$responseHeaders') ?? {},
                        body: '',
                        attributes: {},
                    },
                };
            }
            // Explicit response
            if (value && value.$response) {
                const $response = ctx.convertType({
                    ...value.$response,
                    headers: {
                        ...ctx.getLocal('$responseHeaders'),
                        ...value.$response.headers,
                    },
                }, ${JSON.stringify(ResponseSpecSchema.schema)});
                return {
                    $response,
                };
            }
            // String response
            if (typeof value === 'string') {
                return {
                    $response: {
                        status: 200,
                        headers: {
                            'content-type': ['text/plain'],
                            ...ctx.getLocal('$responseHeaders'),
                        },
                        body: value,
                        attributes: {},
                    },
                };
            }
            // Default JSON response
            return {
                $response: {
                    status: 200,
                    headers: {
                        'content-type': ['application/json'],
                        ...ctx.getLocal('$responseHeaders'),
                    },
                    body: JSON.stringify(value),
                    attributes: {},
                },
            };
        }
        `);
    }

    private getParamsSchema(module: ModuleSpec): SchemaSpec {
        const properties: Record<string, SchemaSpec> = {};
        for (const [paramKey, paramSpec] of Object.entries(module.params)) {
            properties[paramKey] = paramSpec.schema;
        }
        return {
            type: 'object',
            properties,
            additionalProperties: { type: 'any' },
        };
    }

}
