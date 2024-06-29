import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { User } from '../wrappers/User';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Master } from '../wrappers/Master';
import { assertJettonBalanceEqual, deployJettonWithWallet, generateKP, setupMaster, supplyJetton } from './helper';
import { KeyPair } from 'ton-crypto';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';

describe('User', () => {
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
    let master: SandboxContract<Master>;
    let underlyingHolder: SandboxContract<TreasuryContract>;

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
        underlyingHolder = await blockchain.treasury('underlying holder');

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

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and user are ready to use
    });

    it('should mint PT and YT and get maturity', async () => {
        const amount: bigint = 100n;

        const result = await supplyJetton(underlyingHolder, master, underlyingAsset.wallet, amount, principleToken.minter, yieldToken.minter);
        const userAddress = await master.getWalletAddress(underlyingHolder.address);

        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: userAddress,
            deploy: true,
            success: true
        });

        const user = blockchain.openContract(User.createFromAddress(userAddress));
        const maturityFromContract = await user.getMaturity();
        expect(maturityFromContract).toEqual(maturity);
    });

    it('should mint PT and YT and get index', async () => {
        const amount: bigint = 199n;

        const result = await supplyJetton(underlyingHolder, master, underlyingAsset.wallet, amount, principleToken.minter, yieldToken.minter);

        const userAddress = await master.getWalletAddress(underlyingHolder.address);
        // Master -> User Order
        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: userAddress,
            deploy: true,
            success: true
        });

        const user = blockchain.openContract(User.createFromAddress(userAddress));
        const indexFromContract = await user.getIndex();
        expect(indexFromContract).toEqual(1000n);
    });

    it('should mint PT and YT and get index', async () => {
        const amount: bigint = 109n;

        const result = await supplyJetton(underlyingHolder, master, underlyingAsset.wallet, amount, principleToken.minter, yieldToken.minter);
        const userAddress = await master.getWalletAddress(underlyingHolder.address);

        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: userAddress,
            deploy: true,
            success: true
        });

        const user = blockchain.openContract(User.createFromAddress(userAddress));
        const indexFromContract = await user.getIndex();
        expect(indexFromContract).toEqual(1000n);
    });

    it('should redeem before maturity', async () => {
        const amount: bigint = 109n;
        const currentTimestamp: bigint = BigInt(Math.floor(Date.now() / 1000));
        const newTimestamp: bigint = currentTimestamp + 5n; // +5sec

        let newMaster = await setupMaster(blockchain, deployer, masterCode, userCode, underlyingAsset.minter, undefined, newTimestamp, index, kp.publicKey);

        const principleRandomSeed = Math.floor(Math.random() * 10000);
        const principleJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    adminAddress: newMaster.address,
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
                    adminAddress: newMaster.address,
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

        result = await supplyJetton(underlyingHolder, newMaster, underlyingAsset.wallet, amount, principleToken.minter, yieldToken.minter);

        const userAddress = await newMaster.getWalletAddress(underlyingHolder.address);
        const userPrincipleWallet = await principleToken.minter.getWalletAddress(userAddress);
        const userYieldTokenWallet = await yieldToken.minter.getWalletAddress(userAddress);

        expect(result.transactions).toHaveTransaction({
            from: newMaster.address,
            to: userAddress,
            deploy: true,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: principleToken.minter.address,
            to: userPrincipleWallet,
            deploy: true,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: yieldToken.minter.address,
            to: userYieldTokenWallet,
            deploy: true,
            success: true
        });

        const user = blockchain.openContract(User.createFromAddress(userAddress));

        await assertJettonBalanceEqual(blockchain, userPrincipleWallet, amount);
        await assertJettonBalanceEqual(blockchain, userYieldTokenWallet, amount);

        const burnAmount: bigint = 100n;
        const underAssetWalletAddr = await underlyingAsset.minter.getWalletAddress(newMaster.address);
        const redeemResult = await user.sendRedeem(underlyingHolder.getSender(), {
            value: toNano('0.5'),
            queryId: 13,
            jettonAmount: burnAmount,
            masterWalletAddr: underAssetWalletAddr,
            principleTokenAddr: userPrincipleWallet,
            yieldTokenAddr: userYieldTokenWallet,
            fwdPayload: beginCell().endCell()
        });

        expect(redeemResult.transactions).toHaveTransaction({
            from: underlyingHolder.address,
            to: userAddress,
            success: true
        });

        expect(redeemResult.transactions).toHaveTransaction({
            from: userAddress,
            to: userPrincipleWallet,
            success: true
        });

        await assertJettonBalanceEqual(blockchain, userPrincipleWallet, amount - burnAmount);
        await assertJettonBalanceEqual(blockchain, userYieldTokenWallet, amount - burnAmount);

        const updateAddressResult = await newMaster.sendUpdateWalletAddr(deployer.getSender(), toNano('0.1'), { queryId: 100 });
        expect(updateAddressResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: newMaster.address,
            success: true
        });

        expect(updateAddressResult.transactions).toHaveTransaction({
            from: newMaster.address,
            to: underlyingAsset.minter.address,
            success: true
        });

        expect(updateAddressResult.transactions).toHaveTransaction({
            from: underlyingAsset.minter.address,
            to: newMaster.address,
            success: true
        });

        const underlyingAssetWalletAddr = await newMaster.getUnderlyingAssetWalletAddress();
        expect(underlyingAssetWalletAddr?.toRawString()).toEqual(underAssetWalletAddr.toRawString());

        const jettonWallet = JettonWallet.createFromAddress(await underlyingAsset.minter.getWalletAddress(newMaster.address));
        const jetton = blockchain.openContract(jettonWallet);
        let balance = await jetton.getBalance();

        expect(redeemResult.transactions).toHaveTransaction({
            from: newMaster.address,
            to: underAssetWalletAddr,
            success: true
        });

        const underlyingHolderWallet = await underlyingAsset.minter.getWalletAddress(underlyingHolder.address);
        expect(redeemResult.transactions).toHaveTransaction({
            from: underAssetWalletAddr,
            to: underlyingHolderWallet,
            success: true
        });

        const underlyingJettonWallet = JettonWallet.createFromAddress(underlyingHolderWallet);
        const underlyingJetton = blockchain.openContract(underlyingJettonWallet);
        balance = await underlyingJetton.getBalance();
        const expectedBalance = (burnAmount / index) + (1000n - amount);
        expect(balance).toEqual(expectedBalance);
    });

    it('should redeem after maturity', async () => {
        const amount: bigint = 123n;
        const currentTimestamp: bigint = BigInt(Math.floor(Date.now() / 1000));

        let newMaster = await setupMaster(blockchain, deployer, masterCode, userCode, underlyingAsset.minter, undefined, currentTimestamp, index, kp.publicKey);

        const principleRandomSeed = Math.floor(Math.random() * 10000);
        const principleJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    adminAddress: newMaster.address,
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
                    adminAddress: newMaster.address,
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

        result = await supplyJetton(underlyingHolder, newMaster, underlyingAsset.wallet, amount, principleToken.minter, yieldToken.minter);

        const userAddress = await newMaster.getWalletAddress(underlyingHolder.address);
        const userPrincipleWallet = await principleToken.minter.getWalletAddress(userAddress);
        const userYieldTokenWallet = await yieldToken.minter.getWalletAddress(userAddress);

        expect(result.transactions).toHaveTransaction({
            from: newMaster.address,
            to: userAddress,
            deploy: true,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: principleToken.minter.address,
            to: userPrincipleWallet,
            deploy: true,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: yieldToken.minter.address,
            to: userYieldTokenWallet,
            deploy: true,
            success: true
        });

        const user = blockchain.openContract(User.createFromAddress(userAddress));

        await assertJettonBalanceEqual(blockchain, userPrincipleWallet, amount);
        await assertJettonBalanceEqual(blockchain, userYieldTokenWallet, amount);

        const burnAmount = 100n;
        const underAssetWalletAddr = await underlyingAsset.minter.getWalletAddress(newMaster.address);
        const redeemResult = await user.sendRedeem(underlyingHolder.getSender(), {
            value: toNano('0.3'),
            queryId: 13,
            jettonAmount: burnAmount,
            masterWalletAddr: underAssetWalletAddr,
            principleTokenAddr: userPrincipleWallet,
            yieldTokenAddr: userYieldTokenWallet,
            fwdPayload: beginCell().endCell()
        });

        expect(redeemResult.transactions).toHaveTransaction({
            from: underlyingHolder.address,
            to: userAddress,
            success: true
        });

        expect(redeemResult.transactions).toHaveTransaction({
            from: userAddress,
            to: userPrincipleWallet,
            success: true
        });

        await assertJettonBalanceEqual(blockchain, userPrincipleWallet, amount - burnAmount);
        await assertJettonBalanceEqual(blockchain, userYieldTokenWallet, amount);

        expect(redeemResult.transactions).toHaveTransaction({
            from: userAddress,
            to: newMaster.address,
            success: true
        });

        const updateAddressResult = await newMaster.sendUpdateWalletAddr(deployer.getSender(), toNano('0.1'), { queryId: 100 });
        expect(updateAddressResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: newMaster.address,
            success: true
        });

        expect(updateAddressResult.transactions).toHaveTransaction({
            from: newMaster.address,
            to: underlyingAsset.minter.address,
            success: true
        });

        expect(updateAddressResult.transactions).toHaveTransaction({
            from: underlyingAsset.minter.address,
            to: newMaster.address,
            success: true
        });

        expect(redeemResult.transactions).toHaveTransaction({
            from: newMaster.address,
            to: underAssetWalletAddr,
            success: true
        });

        const underlyingHolderWallet = await underlyingAsset.minter.getWalletAddress(underlyingHolder.address);
        expect(redeemResult.transactions).toHaveTransaction({
            from: underAssetWalletAddr,
            to: underlyingHolderWallet,
            success: true
        });

        const underlyingJettonWallet = JettonWallet.createFromAddress(underlyingHolderWallet);
        const underlyingJetton = blockchain.openContract(underlyingJettonWallet);
        const balance = await underlyingJetton.getBalance();
        const expectedBalance = (burnAmount / index) + (1000n - amount);
        expect(balance).toEqual(expectedBalance);
    });
});
