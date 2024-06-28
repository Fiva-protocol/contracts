import { Address, beginCell, toNano } from '@ton/core';
import { JettonMinter } from '../wrappers/JettonMinter';
import { compile, NetworkProvider } from '@ton/blueprint';



export async function run(provider: NetworkProvider, args: string[]) {

    const jetton = provider.open(
        JettonMinter.createFromAddress(Address.parse('EQAAfs9rz_XkIcM-Cu4dxSy-fXTeZPHjKXQFsDHQpXjeMV7X')),
    );

    await jetton.sendMint(provider.sender(), {
        toAddress: Address.parse('0QCceBJmmBJaDvxBH1x8rlWSYlz64aV-xmT1PFJvIgTnOt3X'),
        jettonAmount: toNano('10000'),
        amount: toNano('0.1'),
        queryId: 123,
        value: toNano('0.2'),
    });

    const userWalletAddr = await jetton.getWalletAddress(provider.sender().address as Address);
    console.log(`User wallet address: ${userWalletAddr}`);
}
