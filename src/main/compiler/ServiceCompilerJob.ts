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
            for (const h of route.beforeHooks ?? []) {
                this.emitModuleImport(h.moduleRef);
            }
            for (const h of route.afterHooks ?? []) {
                this.emitModuleImport(h.moduleRef);
            }
            if (route.errorHook) {
                this.emitModuleImport(route.errorHook.moduleRef);
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
                this.emitRouteBody(route);
            });
        });
    }

    private emitRouteBody(route: RouteSpec) {
        this.code.line(`const localParams = {};`);
        this.code.line(`const requestParams = {
            $request,
            ...(typeof $request.body === 'object' ? $request.body : {}),
            ...$request.query,
            ...pathParams,
        };`);
        this.code.line(`let $result = undefined;`);
        this.code.block(`try {`, `}`, () => {
            for (const h of route.beforeHooks ?? []) {
                this.emitBeforeHook(h.moduleRef);
            }
            this.emitRouteHandler(route);
            for (const h of route.afterHooks ?? []) {
                this.emitAfterHook(h.moduleRef);
            }
        });
        this.code.block(`catch ($error) {`, `}`, () => {
            if (route.errorHook) {
                this.emitErrorHook(route.errorHook.moduleRef);
            } else {
                this.code.line('throw $error;');
            }
        });
        this.code.line(`return $result;`);
    }

    private emitBeforeHook(moduleRef: string) {
        this.code.block(`{`, `}`, () => {
            this.code.line(`// Before Hook ${moduleRef}`);
            this.emitHandlerCompute(moduleRef);
            // If before hook returns an object, pass it onwards via local params
            this.code.block(`if ($r && typeof $r === 'object') {`, `}`, () => {
                this.code.line(`Object.assign(localParams, $r);`);
            });
        });
    }

    private emitRouteHandler(route: RouteSpec) {
        this.code.block(`{`, `}`, () => {
            this.code.line(`// Route Handler ${route.moduleRef}`);
            this.emitHandlerCompute(route.moduleRef);
            this.code.line(`$result = $r;`);
        });
    }

    private emitAfterHook(moduleRef: string) {
        this.code.block(`{`, `}`, () => {
            this.code.line(`// After Hook ${moduleRef}`);
            this.emitHandlerCompute(moduleRef, '$result');
            // After hooks overwrite the result
            this.code.line(`$result = $r;`);
        });
    }

    private emitErrorHook(moduleRef: string) {
        this.code.block(`{`, `}`, () => {
            this.code.line(`// Error Hook ${moduleRef}`);
            this.emitHandlerCompute(moduleRef, '$error');
            // Error hook overwrites the result
            this.code.line(`$result = $r;`);
        });
    }

    private emitHandlerCompute(moduleRef: string, ...additionalArgs: string[]) {
        const module = this.loader.resolveModule(moduleRef);
        const paramsSchema = this.getParamsSchema(module);
        const sym = this.symtable.get(`module:${moduleRef}`);
        const variableEntries = this.getVariableEntries(module);
        const args = [...variableEntries, ...additionalArgs];
        this.code.line(`const $p = ctx.convertType({
            ...requestParams,
            ...localParams,
            ${args.join(',')}
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
