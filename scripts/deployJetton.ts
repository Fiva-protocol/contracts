import { Address, beginCell, toNano } from '@ton/core';
import { JettonMinter } from '../wrappers/JettonMinter';
import { compile, NetworkProvider } from '@ton/blueprint';

type JettonMinterContent = {
    type: 0 | 1;
    uri: string;
};

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();
    const contentUrl = args.length > 0 ? args[0] : await ui.input('Jetton content URL');

    const jetton = provider.open(
        JettonMinter.createFromConfig(
            {
                adminAddress: provider.sender().address as Address,
                content: jettonContentToCell({ type: 1, uri: contentUrl }),
                jettonWalletCode: await compile('JettonWallet'),
            },
            await compile('JettonMinter'),
        ),
    );
    await jetton.sendDeploy(provider.sender(), toNano('0.1'));
    await provider.waitForDeploy(jetton.address);

    console.log('Deployed jetton address:', await jetton.address);

    await jetton.sendMint(provider.sender(), {
        toAddress: provider.sender().address as Address,
        jettonAmount: toNano('10000'),
        amount: toNano('0.1'),
        queryId: 123,
        value: toNano('0.2'),
    });

    const userWalletAddr = await jetton.getWalletAddress(provider.sender().address as Address);
    console.log(`User wallet address: ${userWalletAddr}`);
}

export function jettonContentToCell(content: JettonMinterContent) {
    return beginCell().storeUint(content.type, 8).storeStringTail(content.uri).endCell();
}
