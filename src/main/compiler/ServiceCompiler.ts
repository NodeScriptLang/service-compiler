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
        for (const { moduleRef } of serviceSpec.routes) {
            await this.loader.loadModule(moduleRef);
        }
        const job = new ServiceCompilerJob(this.loader, serviceSpec);
        job.run();
        return {
            code: job.getEmittedCode(),
        };
    }

}
