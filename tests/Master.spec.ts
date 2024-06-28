import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { Master } from '../wrappers/Master';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { assertJettonBalanceEqual, deployJettonWithWallet, setupMaster, supplyJetton, generateKP } from './helper';
import { KeyPair, sign } from 'ton-crypto';
import { Opcodes } from '../helpers/Opcodes';

describe('Master', () => {
    let masterCode: Cell;
    let userCode: Cell;
    let jettonMinterCode: Cell;
    let jettonWalletCode: Cell;
    let kp: KeyPair;
    let index = 99n;
    let maturity = 1n;

    beforeAll(async () => {
        masterCode = await compile('Master');
        userCode = await compile('User');
        jettonMinterCode = await compile('JettonMinter');
        jettonWalletCode = await compile('JettonWallet');

        kp = await generateKP();
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let underlyingHolder: SandboxContract<TreasuryContract>;
    let master: SandboxContract<Master>;

    let principleToken: {
        minter: SandboxContract<JettonMinter>;
    };

    let yieldToken: {
        minter: SandboxContract<JettonMinter>;
    };

    let underlyingAsset: {
        minter: SandboxContract<JettonMinter>;
        wallet: SandboxContract<JettonWallet>;
    };

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        underlyingHolder = await blockchain.treasury('underlying');

        master = await setupMaster(blockchain, deployer, masterCode, userCode, maturity, index, kp.publicKey);

        underlyingAsset = await deployJettonWithWallet(
            blockchain,
            deployer,
            jettonMinterCode,
            jettonWalletCode,
            underlyingHolder.address,
            1000n
        );

        const principleRandomSeed = Math.floor(Math.random() * 10000);
        const principleJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    adminAddress: master.address,
                    content: beginCell().storeUint(principleRandomSeed, 256).endCell(),
                    jettonWalletCode: jettonWalletCode
                },
                jettonMinterCode
            )
        );

        let result = await principleJettonMinter.sendDeploy(deployer.getSender(), toNano('0.01'));

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: principleJettonMinter.address,
            deploy: true,
            success: true
        });

        principleToken = {
            minter: principleJettonMinter
        };

        const yieldRandomSeed = Math.floor(Math.random() * 10000);
        const yieldJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    adminAddress: master.address,
                    content: beginCell().storeUint(yieldRandomSeed, 256).endCell(),
                    jettonWalletCode: jettonWalletCode
                },
                jettonMinterCode
            )
        );

        result = await yieldJettonMinter.sendDeploy(deployer.getSender(), toNano('0.01'));

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: yieldJettonMinter.address,
            deploy: true,
            success: true
        });

        yieldToken = {
            minter: yieldJettonMinter
        };
    });

    it('should mint PT and YT', async () => {
        const amount: bigint = 10n;

        const result = await supplyJetton(underlyingHolder, master, underlyingAsset.wallet, amount, principleToken.minter, yieldToken.minter, maturity);

        // User -> User Jetton1 Wallet
        expect(result.transactions).toHaveTransaction({
            from: underlyingHolder.address,
            to: underlyingAsset.wallet.address,
            success: true
        });

        const jetton_wallet_master = await underlyingAsset.minter.getWalletAddress(master.address);
        // User Jetton1 Wallet -> Master Order Jetton1 Wallet
        expect(result.transactions).toHaveTransaction({
            from: underlyingAsset.wallet.address,
            to: jetton_wallet_master,
            deploy: true,
            success: true
        });

        // Master Order Jetton1 Wallet -> Master
        expect(result.transactions).toHaveTransaction({
            from: jetton_wallet_master,
            to: master.address,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: principleToken.minter.address,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: yieldToken.minter.address,
            success: true
        });

        const user_address = await master.getWalletAddress(underlyingHolder.address);
        // Master -> User Order
        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: user_address,
            deploy: true,
            success: true
        });

        const userPrincipleTokenAddr = await principleToken.minter.getWalletAddress(user_address);
        const userYieldTokenAddr = await yieldToken.minter.getWalletAddress(user_address);

        expect(result.transactions).toHaveTransaction({
            from: principleToken.minter.address,
            to: userPrincipleTokenAddr,
            deploy: true,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: yieldToken.minter.address,
            to: userYieldTokenAddr,
            deploy: true,
            success: true
        });

        // Jettons are in User Wallet
        // await assertJettonBalanceEqual(blockchain, jetton_wallet_master, 0n);
        await assertJettonBalanceEqual(blockchain, userPrincipleTokenAddr, amount);
        await assertJettonBalanceEqual(blockchain, userYieldTokenAddr, amount);
    });

    it('should fail on wrong signature', async () => {
        const invalidKP = await generateKP();

        await expect(
            master.sendExternalMessage(
                {
                    opCode: Opcodes.updateIndex,
                    index: 300n,
                    signFunc: (buf) => sign(buf, invalidKP.secretKey)
                }
            )
        ).rejects.toThrow();
    });

    it('should update index', async () => {
        const newIndex: bigint = 27n;

        await master.sendExternalMessage(
            {
                opCode: Opcodes.updateIndex,
                index: newIndex,
                signFunc: (buf) => sign(buf, kp.secretKey)
            }
        );

        expect(await master.getIndex()).toEqual(newIndex);
    });
});