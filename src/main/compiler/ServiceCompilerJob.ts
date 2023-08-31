import { CodeBuilder, SymTable } from '@nodescript/core/compiler';
import { ModuleLoader } from '@nodescript/core/runtime';
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
            for (const route of this.serviceSpec.routes) {
                this.emitRoute(route);
            }
            this.emitThrow('RouteNotFoundError', 404, 'Route not found');
        });
    }

    private emitThrow(name: string, status: number, message: string) {
        this.code.block('{', '}', () => {
            this.code.line(`const error = new Error(${JSON.stringify(message)});`);
            this.code.line(`error.name = ${JSON.stringify(name)}`);
            this.code.line(`error.status = ${JSON.stringify(status)}`);
            this.code.line('throw error;');
        });
    }

    private emitRoute(route: RouteSpec) {
        this.code.line(`// ${route.method} ${route.path}`);
        // Match method
        const condition = route.method === '*' ? `true` : `$request.method === ${JSON.stringify(route.method)}`;
        this.code.block(`if (${condition}) {`, `}`, () => {
            // Match path
            this.code.line(`const pathParams = ctx.lib.matchPath(${JSON.stringify(route.path)}, $request.path);`);
            this.code.block(`if (pathParams != null) {`, `}`, () => {
                this.code.line(`const localParams = {};`);
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
        this.code.block(`{`, `}`, () => {
            this.code.line(`// Middleware ${moduleRef}`);
            this.emitHandlerCompute(moduleRef);
            // If middleware returns an object with $response, stop processing and return it
            this.code.block(`if (typeof $r?.response === 'object') {`, `}`, () => {
                this.code.line('return $r;');
            });
            // If middlware returns an object, pass it onwards via local params
            this.code.block(`if ($r && typeof $r === 'object') {`, `}`, () => {
                this.code.line(`Object.assign(localParams, $r);`);
            });
        });
    }

    private emitRouteHandler(route: RouteSpec) {
        this.code.block(`{`, `}`, () => {
            this.code.line(`// Route handler ${route.moduleRef}`);
            this.emitHandlerCompute(route.moduleRef);
            this.code.line(`return $r;`);
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
                ...localParams,
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
