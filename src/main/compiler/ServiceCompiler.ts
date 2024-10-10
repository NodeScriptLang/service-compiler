import { ModuleLoader } from '@nodescript/core/runtime';

import { ServiceSpec } from '../schema/ServiceSpec.js';
import { ServiceCompilerJob } from './ServiceCompilerJob.js';

export interface ServiceCompilerResult {
    code: string;
}

export class ServiceCompiler {

    constructor(
        readonly loader: ModuleLoader,
    ) {}

    async compile(
        serviceSpec: ServiceSpec,
    ) {
        for (const route of serviceSpec.routes) {
            await this.loader.loadModule(route.moduleRef);
            for (const h of route.beforeHooks ?? []) {
                await this.loader.loadModule(h.moduleRef);
            }
            for (const h of route.afterHooks ?? []) {
                await this.loader.loadModule(h.moduleRef);
            }
            if (route.errorHook) {
                await this.loader.loadModule(route.errorHook.moduleRef);
            }
        }
        const job = new ServiceCompilerJob(this.loader, serviceSpec);
        job.run();
        return {
            code: job.getEmittedCode(),
        };
    }

}
