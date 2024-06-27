import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import '@ton/test-utils';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { Master } from '../wrappers/Master';
import { Opcodes } from '../helpers/Opcodes';

export async function setupMaster(
    blockchain: Blockchain,
    deployer: SandboxContract<TreasuryContract>,
    masterCode: Cell,
    userCode: Cell
) {
    const master = blockchain.openContract(
        Master.createFromConfig(
            {
                admin: deployer.address,
                userCode: userCode
            },
            masterCode
        )
    );

    const result = await master.sendDeploy(deployer.getSender(), toNano('0.5'));
    expect(result.transactions).toHaveTransaction({
        from: deployer.address,
        to: master.address,
        deploy: true,
        success: true
    });

    return master;
}

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

    expect(await jettonMinter.getTotalsupply()).toEqual(jettonsAmount);
    expect(await walletJetton.getBalance()).toEqual(jettonsAmount);

    return {
        minter: jettonMinter,
        wallet: walletJetton
    };
}

export async function supplyJetton(
    underlyingHolder: SandboxContract<TreasuryContract>,
    master: SandboxContract<Master>,
    underlyingJettonWallet: SandboxContract<JettonWallet>,
    amount: bigint,
    principleJettonMinter: SandboxContract<JettonMinter>,
    yieldJettonMinter: SandboxContract<JettonMinter>
) {
    console.log(yieldJettonMinter.address.toRawString(), principleJettonMinter.address.toRawString());
    return await underlyingJettonWallet.sendTransfer(underlyingHolder.getSender(), {
            value: toNano('0.5'),
            toAddress: master.address,
            queryId: 1,
            jettonAmount: amount,
            fwdAmount: toNano('0.4'),
            fwdPayload: beginCell()
                .storeUint(Opcodes.supply, 32) // op code
                .storeUint(11, 64) // query id
                .storeAddress(underlyingHolder.address)
                .storeCoins(amount)
                .storeAddress(yieldJettonMinter.address)
                .storeAddress(principleJettonMinter.address)
                .endCell()
        }
    );
}

export async function assertJettonBalanceEqual(blockchain: Blockchain, jettonAddress: Address, equalTo: bigint) {
    const jettonWallet = JettonWallet.createFromAddress(jettonAddress);
    const jetton = blockchain.openContract(jettonWallet);
    const balance = await jetton.getBalance();
    expect(balance).toEqual(equalTo);
}