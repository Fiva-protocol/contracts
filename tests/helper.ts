import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, beginCell, toNano } from '@ton/core';
import '@ton/test-utils';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';

export async function deployJettonWithWallet(
    blockchain: Blockchain,
    deployer: SandboxContract<TreasuryContract>,
    jettonMinterCode: Cell,
    jettonWalletCode: Cell,
    sendTokensToAddr: Address,
    jettonsAmount: bigint
) {
    const randomSeed = Math.floor(Math.random() * 10000);
    const jettonMinter = blockchain.openContract(
        JettonMinter.createFromConfig(
            {
                adminAddress: deployer.address,
                content: beginCell().storeUint(randomSeed, 256).endCell(),
                jettonWalletCode: jettonWalletCode
            },
            jettonMinterCode
        )
    );
    let result = await jettonMinter.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(result.transactions).toHaveTransaction({
        from: deployer.address,
        to: jettonMinter.address,
        deploy: true,
        success: true
    });

    result = await jettonMinter.sendMint(deployer.getSender(), {
        toAddress: sendTokensToAddr,
        jettonAmount: jettonsAmount,
        amount: toNano('0.05'),
        queryId: Date.now(),
        value: toNano('0.2')
    });
    expect(result.transactions).toHaveTransaction({
        from: deployer.address,
        to: jettonMinter.address,
        deploy: false,
        success: true
    });

    const creator_wallet_addr = await jettonMinter.getWalletAddress(sendTokensToAddr);
    const walletJetton = blockchain.openContract(JettonWallet.createFromAddress(creator_wallet_addr));
    return {
        minter: jettonMinter,
        wallet: walletJetton
    };
}