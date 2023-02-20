import { StandardModuleLoader } from '@nodescript/core/runtime';
import { ModuleSpecSchema } from '@nodescript/core/schema';
import { ModuleSpec } from '@nodescript/core/types';

import { runtime } from './runtime.js';

/**
 * Custom module loader for tests.
 *
 * Loads the module from out/test/modules directory using `await import`.
 * This is just to save hassle of pre-bundling test module definitions.
 */
export class TestModuleLoader extends StandardModuleLoader {

    override resolveModuleUrl(moduleRef: string): string {
        return runtime.makeUrl(`/out/test/modules/${moduleRef}.js`);
    }

    override resolveComputeUrl(moduleRef: string): string {
        return runtime.makeUrl(`/out/test/modules/${moduleRef}.js`);
    }

    override async fetchModule(ref: string): Promise<ModuleSpec> {
        const url = this.resolveModuleUrl(ref);
        const { module } = await import(url);
        return ModuleSpecSchema.decode(module);
    }

}
