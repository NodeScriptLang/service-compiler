import { CodeBuilder, SymTable } from '@nodescript/core/compiler';

import { ServiceSpec } from '../index.js';
import { RouteSpec } from '../schema/RouteSpec.js';

export class ServiceCompilerJob {

    private done = false;
    private code = new CodeBuilder();
    private symtable = new SymTable();

    private sortedRoutes: RouteSpec[] = [];

    constructor(readonly serviceSpec: ServiceSpec) {
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
        this.emitImports();
        this.done = true;
    }

    getEmittedCode() {
        return this.code.toString();
    }

    private emitImports() {
        for (const route of this.sortedRoutes) {
            const { moduleUrl } = route;
            const key = `module:${moduleUrl}`;
            const sym = this.symtable.get(key, '') ?? this.symtable.nextSym('m1');
            this.symtable.set(key, sym);
            this.code.line(`import { compute as ${sym} } from '${moduleUrl}'`);
        }
    }

}
