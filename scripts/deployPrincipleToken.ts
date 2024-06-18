import { toNano } from '@ton/core';
import { PrincipleToken } from '../wrappers/PrincipleToken';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const principleToken = provider.open(PrincipleToken.createFromConfig({}, await compile('PrincipleToken')));

    await principleToken.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(principleToken.address);

    // run methods on `principleToken`
}
