import { toNano } from '@ton/core';
import { Master } from '../wrappers/Master';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const master = provider.open(Master.createFromConfig({}, await compile('Master')));

    await master.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(master.address);

    // run methods on `master`
}
