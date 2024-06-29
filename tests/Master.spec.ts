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
    let index = 1000n;
    let maturity = 1000n;

    beforeAll(async () => {
        masterCode = await compile('Master');
        userCode = await compile('User');
        jettonMinterCode = await compile('JettonMinter');
        jettonWalletCode = await compile('JettonWallet');

        kp = await generateKP();
    }, 15000);

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

        underlyingAsset = await deployJettonWithWallet(
            blockchain,
            deployer,
            jettonMinterCode,
            jettonWalletCode,
            underlyingHolder.address,
            1000n
        );

        master = await setupMaster(blockchain, deployer, masterCode, userCode, underlyingAsset.minter, undefined, maturity, index, kp.publicKey);

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
    }, 15000);

    it('should deploy', () => {

    });

    it('should mint PT and YT', async () => {
        const amount: bigint = 10n;

        const result = await supplyJetton(underlyingHolder, master, underlyingAsset.wallet, amount, principleToken.minter, yieldToken.minter);

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

        const userAddress = await master.getWalletAddress(underlyingHolder.address);
        // Master -> User Order
        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: userAddress,
            deploy: true,
            success: true
        });

        const userPrincipleTokenAddr = await principleToken.minter.getWalletAddress(userAddress);
        const userYieldTokenAddr = await yieldToken.minter.getWalletAddress(userAddress);
        const masterUnderlyingTokenAddr = await underlyingAsset.minter.getWalletAddress(master.address);

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
        await assertJettonBalanceEqual(blockchain, userPrincipleTokenAddr, amount);
        await assertJettonBalanceEqual(blockchain, userYieldTokenAddr, amount);
        await assertJettonBalanceEqual(blockchain, masterUnderlyingTokenAddr, amount);

        const underAssetMinterAddr = await master.getUnderlyingAssetMinterAddress();
        expect(underAssetMinterAddr.toRawString()).toEqual(underlyingAsset.minter.address.toRawString());

        const underAssetWalletAddr = await master.getUnderlyingAssetWalletAddress();
        expect(underAssetWalletAddr).toEqual(null);
    }, 10000);

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

    it('should claim rewards', async () => {
        const jettonAmount: bigint = 100n;
        await supplyJetton(underlyingHolder, master, underlyingAsset.wallet, jettonAmount, principleToken.minter, yieldToken.minter);
        const userAddress = await master.getWalletAddress(underlyingHolder.address);
        const newIndex: bigint = 1100n;

        await underlyingAsset.minter.sendMint(deployer.getSender(), {
            toAddress: master.address,
            jettonAmount: 10000n,
            amount: toNano('0.05'),
            queryId: Date.now(),
            value: toNano('0.2')
        });

        await master.sendExternalMessage(
            {
                opCode: Opcodes.updateIndex,
                index: newIndex,
                signFunc: (buf) => sign(buf, kp.secretKey)
            }
        );

        const tsMasterAddress = await underlyingAsset.minter.getWalletAddress(master.address);
        const result = await master.sendClaim(
            underlyingHolder.getSender(),
            {
                queryId: 100,
                amount: toNano('0.5'),
                tsMasterAddress: tsMasterAddress
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: underlyingHolder.address,
            to: master.address,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: userAddress,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: userAddress,
            to: master.address,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: tsMasterAddress,
            success: true
        });
        const userTsAddress = await underlyingAsset.minter.getWalletAddress(underlyingHolder.address);

        expect(result.transactions).toHaveTransaction({
            from: tsMasterAddress,
            to: userTsAddress,
            success: true
        });


        const jettonWallet = JettonWallet.createFromAddress(userTsAddress);
        const jetton = blockchain.openContract(jettonWallet);
        const balance = await jetton.getBalance();
        expect(balance).toEqual(908n);
    });

    it('calculate balance correct when Initial Index is not 1000', async () => {
        const jettonAmount: bigint = 100n;
        const newIndex: bigint = 1100n;
        const amount: bigint = 110n;

        const userAddress = await master.getWalletAddress(underlyingHolder.address);
        const userPrincipleTokenAddr = await principleToken.minter.getWalletAddress(userAddress);
        const userYieldTokenAddr = await yieldToken.minter.getWalletAddress(userAddress);

        await master.sendExternalMessage(
            {
                opCode: Opcodes.updateIndex,
                index: newIndex,
                signFunc: (buf) => sign(buf, kp.secretKey)
            }
        );

        await supplyJetton(underlyingHolder, master, underlyingAsset.wallet, jettonAmount, principleToken.minter, yieldToken.minter);
        await assertJettonBalanceEqual(blockchain, userPrincipleTokenAddr, amount);
        await assertJettonBalanceEqual(blockchain, userYieldTokenAddr, amount);


    });

    it('calculate interest correct when Initial Index is not 1000', async () => {
        const jettonAmount: bigint = 100n;
        const newIndex: bigint = 1100n;
        const interestIndex: bigint = 1300n;


        await underlyingAsset.minter.sendMint(deployer.getSender(), {
            toAddress: master.address,
            jettonAmount: 10000n,
            amount: toNano('0.05'),
            queryId: Date.now(),
            value: toNano('0.2')
        });

        await master.sendExternalMessage(
            {
                opCode: Opcodes.updateIndex,
                index: newIndex,
                signFunc: (buf) => sign(buf, kp.secretKey)
            }
        );

        await supplyJetton(underlyingHolder, master, underlyingAsset.wallet, jettonAmount, principleToken.minter, yieldToken.minter);

        await master.sendExternalMessage(
            {
                opCode: Opcodes.updateIndex,
                index: interestIndex,
                signFunc: (buf) => sign(buf, kp.secretKey)
            }
        );

        const tsMasterAddress = await underlyingAsset.minter.getWalletAddress(master.address);
        await master.sendClaim(
            underlyingHolder.getSender(),
            {
                queryId: 100,
                amount: toNano('0.5'),
                tsMasterAddress: tsMasterAddress
            }
        );
        const userTsAddress = await underlyingAsset.minter.getWalletAddress(underlyingHolder.address);
        const jettonWallet = JettonWallet.createFromAddress(userTsAddress);
        const jetton = blockchain.openContract(jettonWallet);
        const balance = await jetton.getBalance();
        expect(balance).toEqual(911n);
    });
});