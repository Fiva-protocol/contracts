import { Address, toNano } from '@ton/core';
import { Master } from '../wrappers/Master';
import { compile, NetworkProvider } from '@ton/blueprint';

const pubKeyString = '758c2f306980f710c63dd8545d132b3172ef5a6229376861d4455e7ca1aed8b5';

// Convert the string to a Buffer
const pubKeyBuffer = Buffer.from(pubKeyString, 'hex');

export async function run(provider: NetworkProvider) {
    const master = provider.open(
        Master.createFromConfig(
            {
                admin: provider.sender().address as Address,
                userCode: await compile('User'),
                maturity: 1735685999n,
                underlyingAssetMinterAddr: Address.parse('kQCwR07mEDg22t_TYI1oXrb5lRkRUBtmJSjpKGdw_TL2B4yf'),
                underlyingAssetWalletAddr: undefined,
                index: 1000n,
                pubKey: pubKeyBuffer,
            },
            await compile('Master'),
        ),
    );

    await master.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(master.address);
}
