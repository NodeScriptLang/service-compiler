import { CodeBuilder, SymTable } from '@nodescript/core/compiler';
import { ModuleLoader } from '@nodescript/core/runtime';
import { ModuleSpec, SchemaSpec } from '@nodescript/core/types';

import { ServiceSpec } from '../index.js';
import { RouteSpec } from '../schema/RouteSpec.js';
import { processError } from '../util/compiler-functions.js';

export class ServiceCompilerJob {

    private done = false;
    private code = new CodeBuilder();
    private symtable = new SymTable();

    private sortedRoutes: RouteSpec[] = [];

    constructor(
        readonly loader: ModuleLoader,
        readonly serviceSpec: ServiceSpec,
    ) {
        this.sortedRoutes = this.serviceSpec.routes.slice().sort((a, b) => {
            if (a.priority === b.priority) {
                return a.path < b.path ? -1 : 1;
            }
            return a.priority > b.priority ? -1 : 1;
        });
    }

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
        for (const route of this.sortedRoutes) {
            const computeUrl = this.loader.resolveComputeUrl(route.moduleRef);
            const key = `module:${route.moduleRef}`;
            let sym = this.symtable.get(key, '');
            if (!sym) {
                sym = this.symtable.nextSym('m');
                this.symtable.set(key, sym);
                this.code.line(`import { compute as ${sym} } from '${computeUrl}';`);
            }
        }
    }

    private emitCompute() {
        this.code.block('export async function compute(params, ctx) {', '}', () => {
            this.code.line(`const $request = params.$request`);
            this.code.line(`const $variables = params.$variables ?? Object.create(null)`);
            this.code.line(`const $state = params.$state ?? Object.create(null)`);
            for (const route of this.sortedRoutes) {
                this.emitRoute(route);
            }
            this.code.line(`return undefined;`);
        });
    }

    private emitRoute(route: RouteSpec) {
        const module = this.loader.resolveModule(route.moduleRef);
        const paramsSchema = this.getParamsSchema(module);
        const sym = this.symtable.get(`module:${route.moduleRef}`);
        this.code.line(`// ${route.method} ${route.path} - ${route.moduleRef}`);
        // Match method
        const condition = route.method === '*' ? `true` : `$request.method === ${JSON.stringify(route.method)}`;
        this.code.block(`if (${condition}) {`, `}`, () => {
            // Match path
            this.code.line(`const pathParams = ctx.lib.matchPath(${JSON.stringify(route.path)}, $request.path);`);
            this.code.block(`if (pathParams != null) {`, `}`, () => {
                // Assemble the parameters
                this.code.line(`const $p = ctx.convertType({ $request, ...$variables, ...$state }, ${JSON.stringify(paramsSchema)})`);
                this.code.block(`try {`, `}`, () => {
                    // Invoke the module
                    this.code.line(`const $r = await ${sym}($p, ctx.newScope());`);
                    if (route.middleware) {
                        // If middleware returns an object, it could either be a response or state
                        this.code.block(`if ($r && typeof $r === 'object') {`, `}`, () => {
                            this.code.block(`if ($r.$response) {`, `}`, () => {
                                this.code.line('return { $response: $r.$response };');
                            });
                            // Otherwise append it to $state to pass along
                            this.code.line(`Object.assign($state, $r)`);
                        });
                    } else {
                        // If it's an endpoint, just return the response
                        this.code.line(`return $r`);
                    }
                });
                this.code.block(`catch (error) {`, `}`, () => {
                    // If the module throws, convert the error into response and return it.
                    this.code.line(`return processError(error)`);
                });
            });
        });
    }

    private emitUtilities() {
        this.code.line(processError.toString());
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
