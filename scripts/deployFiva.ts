import { toNano } from '@ton/core';
import { Fiva } from '../wrappers/Fiva';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const fiva = provider.open(Fiva.createFromConfig({}, await compile('Fiva')));

    await fiva.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(fiva.address);

    // run methods on `fiva`
}
