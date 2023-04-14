import { FsModuleLoader } from '@nodescript/core/fs';
import { GraphEvalContext } from '@nodescript/core/runtime';
import { RequestSpec } from '@nodescript/core/schema';
import { evalEsmModule } from '@nodescript/core/util';

import { ServiceCompiler, ServiceSpec } from '../main/index.js';

/**
 * Test runtime utilities.
 * It has to be identical for each test case.
 *
 * Warning: if runtime is modified, make sure it is fully restored.
 */
export class TestRuntime {
    httpPort = Number(process.env.PORT) || 8085;

    makeUrl(path: string) {
        return `http://127.0.0.1:${this.httpPort}${path}`;
    }

    createLoader() {
        const loader = new FsModuleLoader('./out/test/modules');
        return loader;
    }

    async invokeService(
        serviceSpec: ServiceSpec,
        $request: RequestSpec,
        $variables: Record<string, string> = {},
    ) {
        const loader = runtime.createLoader();
        const compiler = new ServiceCompiler(loader);
        const { code } = await compiler.compile(serviceSpec);
        const { compute } = await evalEsmModule(code);
        const ctx = new GraphEvalContext();
        const res = await compute({
            $request,
            $variables,
        }, ctx);
        return { res, ctx };
    }

}

export const runtime = new TestRuntime();
