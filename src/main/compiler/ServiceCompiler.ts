import { ServiceSpec } from '../schema/ServiceSpec.js';
import { ServiceCompilerJob } from './ServiceCompilerJob.js';

export interface ServiceCompilerResult {
    code: string;
}

export class ServiceCompiler {

    async compile(serviceSpec: ServiceSpec) {
        const job = new ServiceCompilerJob(serviceSpec);
        job.run();
        return {
            code: job.getEmittedCode(),
        };
    }

}
