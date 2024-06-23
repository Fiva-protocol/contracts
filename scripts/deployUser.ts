import { toNano } from '@ton/core';
import { User } from '../wrappers/User';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const user = provider.open(User.createFromConfig({}, await compile('User')));

    await user.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(user.address);

    // run methods on `user`
}
