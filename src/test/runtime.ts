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

    makeModuleUrl(moduleRef: string) {
        return this.makeUrl(`/out/test/modules/${moduleRef}.js`);
    }
}

export const runtime = new TestRuntime();
