import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { User } from '../wrappers/User';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Master } from '../wrappers/Master';
import { assertJettonBalanceEqual, deployJettonWithWallet, generateKP, setupMaster, supplyJetton } from './helper';
import { KeyPair, sign } from 'ton-crypto';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { Opcodes } from '../helpers/Opcodes';

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
            1000n,
        );

        master = await setupMaster(
            blockchain,
            deployer,
            masterCode,
            userCode,
            underlyingAsset.minter,
            undefined,
            maturity,
            index,
            kp.publicKey,
        );

        const principleRandomSeed = Math.floor(Math.random() * 10000);
        const principleJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    adminAddress: master.address,
                    content: beginCell().storeUint(principleRandomSeed, 256).endCell(),
                    jettonWalletCode: jettonWalletCode,
                },
                jettonMinterCode,
            ),
        );

        let result = await principleJettonMinter.sendDeploy(deployer.getSender(), toNano('0.01'));

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: principleJettonMinter.address,
            deploy: true,
            success: true,
        });

        principleToken = {
            minter: principleJettonMinter,
        };

        const yieldRandomSeed = Math.floor(Math.random() * 10000);
        const yieldJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    adminAddress: master.address,
                    content: beginCell().storeUint(yieldRandomSeed, 256).endCell(),
                    jettonWalletCode: jettonWalletCode,
                },
                jettonMinterCode,
            ),
        );

        result = await yieldJettonMinter.sendDeploy(deployer.getSender(), toNano('0.01'));

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: yieldJettonMinter.address,
            deploy: true,
            success: true,
        });

        yieldToken = {
            minter: yieldJettonMinter,
        };

        await master.sendMinderAddr({
            opCode: Opcodes.setPTMinderAddr,
            minderAddr: principleToken.minter.address,
            signFunc: (buf: Buffer) => sign(buf, kp.secretKey),
        });

        await master.sendMinderAddr({
            opCode: Opcodes.setYTMinderAddr,
            minderAddr: yieldToken.minter.address,
            signFunc: (buf: Buffer) => sign(buf, kp.secretKey),
        });

        const masterTonAddresses = await underlyingAsset.minter.getWalletAddress(master.address);
        await master.sendMasterTonAddr({
            opCode: Opcodes.setMasterTONAddr,
            masterTonAddr: masterTonAddresses,
            signFunc: (buf: Buffer) => sign(buf, kp.secretKey),
        });
    }, 15000);

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and user are ready to use
    });

    it('should mint PT and YT and get maturity', async () => {
        const amount: bigint = 100n;

        const result = await supplyJetton(
            underlyingHolder,
            master,
            underlyingAsset.wallet,
            amount,
            principleToken.minter,
            yieldToken.minter,
        );
        const userAddress = await master.getWalletAddress(underlyingHolder.address);

        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: userAddress,
            deploy: true,
            success: true,
        });

        const user = blockchain.openContract(User.createFromAddress(userAddress));
        const maturityFromContract = await user.getMaturity();
        expect(maturityFromContract).toEqual(maturity);
    });

    it('should mint PT and YT and get index', async () => {
        const amount: bigint = 199n;

        const result = await supplyJetton(
            underlyingHolder,
            master,
            underlyingAsset.wallet,
            amount,
            principleToken.minter,
            yieldToken.minter,
        );

        const userAddress = await master.getWalletAddress(underlyingHolder.address);
        // Master -> User Order
        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: userAddress,
            deploy: true,
            success: true,
        });

        const user = blockchain.openContract(User.createFromAddress(userAddress));
        const indexFromContract = await user.getIndex();
        expect(indexFromContract).toEqual(1000n);
    });

    it('should mint PT and YT and get index', async () => {
        const amount: bigint = 109n;

        const result = await supplyJetton(
            underlyingHolder,
            master,
            underlyingAsset.wallet,
            amount,
            principleToken.minter,
            yieldToken.minter,
        );
        const userAddress = await master.getWalletAddress(underlyingHolder.address);

        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: userAddress,
            deploy: true,
            success: true,
        });

        const user = blockchain.openContract(User.createFromAddress(userAddress));
        const indexFromContract = await user.getIndex();
        expect(indexFromContract).toEqual(1000n);
    });

    it('should redeem after maturity', async () => {
        const amount: bigint = 109n;
        const currentTimestamp: bigint = BigInt(Math.floor(Date.now() / 1000)) - 1000n;

        let newMaster = await setupMaster(
            blockchain,
            deployer,
            masterCode,
            userCode,
            underlyingAsset.minter,
            undefined,
            currentTimestamp,
            index,
            kp.publicKey,
        );

        const principleRandomSeed = Math.floor(Math.random() * 10000);
        const principleJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    adminAddress: newMaster.address,
                    content: beginCell().storeUint(principleRandomSeed, 256).endCell(),
                    jettonWalletCode: jettonWalletCode,
                },
                jettonMinterCode,
            ),
        );

        let result = await principleJettonMinter.sendDeploy(deployer.getSender(), toNano('0.01'));

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: principleJettonMinter.address,
            deploy: true,
            success: true,
        });

        principleToken = {
            minter: principleJettonMinter,
        };

        const yieldRandomSeed = Math.floor(Math.random() * 10000);
        const yieldJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    adminAddress: newMaster.address,
                    content: beginCell().storeUint(yieldRandomSeed, 256).endCell(),
                    jettonWalletCode: jettonWalletCode,
                },
                jettonMinterCode,
            ),
        );

        result = await yieldJettonMinter.sendDeploy(deployer.getSender(), toNano('0.01'));

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: yieldJettonMinter.address,
            deploy: true,
            success: true,
        });

        yieldToken = {
            minter: yieldJettonMinter,
        };

        await newMaster.sendMinderAddr({
            opCode: Opcodes.setPTMinderAddr,
            minderAddr: principleToken.minter.address,
            signFunc: (buf: Buffer) => sign(buf, kp.secretKey),
        });

        await newMaster.sendMinderAddr({
            opCode: Opcodes.setYTMinderAddr,
            minderAddr: yieldToken.minter.address,
            signFunc: (buf: Buffer) => sign(buf, kp.secretKey),
        });

        await newMaster.sendMasterTonAddr({
            opCode: Opcodes.setMasterTONAddr,
            masterTonAddr: await underlyingAsset.minter.getWalletAddress(newMaster.address),
            signFunc: (buf: Buffer) => sign(buf, kp.secretKey),
        });

        result = await supplyJetton(
            underlyingHolder,
            newMaster,
            underlyingAsset.wallet,
            amount,
            principleToken.minter,
            yieldToken.minter,
        );

        const userAddress = await newMaster.getWalletAddress(underlyingHolder.address);
        const userPrincipleWalletAddress = await principleToken.minter.getWalletAddress(underlyingHolder.address);
        const userYieldTokenWalletAddress = await yieldToken.minter.getWalletAddress(underlyingHolder.address);

        expect(result.transactions).toHaveTransaction({
            from: newMaster.address,
            to: userAddress,
            deploy: true,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: principleToken.minter.address,
            to: userPrincipleWalletAddress,
            deploy: true,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: yieldToken.minter.address,
            to: userYieldTokenWalletAddress,
            deploy: true,
            success: true,
        });

        const user = blockchain.openContract(User.createFromAddress(userAddress));

        await assertJettonBalanceEqual(blockchain, userPrincipleWalletAddress, amount);
        await assertJettonBalanceEqual(blockchain, userYieldTokenWalletAddress, amount);

        const userPrincipleWallet = blockchain.openContract(JettonWallet.createFromAddress(userPrincipleWalletAddress));
        const userYieldWallet = blockchain.openContract(JettonWallet.createFromAddress(userYieldTokenWalletAddress));

        const burnAmount = 100n;
        const transferResult = await userPrincipleWallet.sendTransfer(underlyingHolder.getSender(), {
            value: toNano('0.5'),
            toAddress: userAddress,
            queryId: 113,
            jettonAmount: burnAmount,
            fwdAmount: toNano('0.4'),
            fwdPayload: beginCell()
                .storeUint(Opcodes.redeem, 32)
                .storeUint(114, 64)
                .storeAddress(await principleToken.minter.getWalletAddress(userAddress))
                .storeAddress(await yieldToken.minter.getWalletAddress(userAddress))
                .storeAddress(await underlyingAsset.minter.getWalletAddress(newMaster.address))
                .storeUint(0, 2)
                .endCell(),
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: underlyingHolder.address,
            to: userPrincipleWalletAddress,
            success: true,
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: userPrincipleWalletAddress,
            to: await principleToken.minter.getWalletAddress(userAddress),
            success: true,
            deploy: true,
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: await principleToken.minter.getWalletAddress(userAddress),
            to: userAddress,
            success: true,
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: userAddress,
            to: principleToken.minter.address,
            success: true,
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: principleToken.minter.address,
            to: userAddress,
            success: true,
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: userAddress,
            to: await principleToken.minter.getWalletAddress(userAddress),
            success: true,
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: userAddress,
            to: newMaster.address,
            success: true,
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: newMaster.address,
            to: await underlyingAsset.minter.getWalletAddress(newMaster.address),
            success: true,
        });

        const underlyingHolderWallet = await underlyingAsset.minter.getWalletAddress(underlyingHolder.address);
        expect(transferResult.transactions).toHaveTransaction({
            from: await underlyingAsset.minter.getWalletAddress(newMaster.address),
            to: underlyingHolderWallet,
            success: true,
        });

        const underlyingJettonWallet = JettonWallet.createFromAddress(underlyingHolderWallet);
        const underlyingJetton = blockchain.openContract(underlyingJettonWallet);
        const balance = await underlyingJetton.getBalance();
        const expectedBalance = burnAmount / index + (1000n - amount);
        expect(balance).toEqual(expectedBalance);
    });

    it('should redeem before maturity', async () => {
        const amount: bigint = 109n;
        const currentTimestamp: bigint = BigInt(Math.floor(Date.now() / 1000));
        const newTimestamp: bigint = currentTimestamp + 5n;

        let newMaster = await setupMaster(
            blockchain,
            deployer,
            masterCode,
            userCode,
            underlyingAsset.minter,
            undefined,
            newTimestamp,
            index,
            kp.publicKey,
        );

        const principleRandomSeed = Math.floor(Math.random() * 10000);
        const principleJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    adminAddress: newMaster.address,
                    content: beginCell().storeUint(principleRandomSeed, 256).endCell(),
                    jettonWalletCode: jettonWalletCode,
                },
                jettonMinterCode,
            ),
        );

        let result = await principleJettonMinter.sendDeploy(deployer.getSender(), toNano('0.01'));

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: principleJettonMinter.address,
            deploy: true,
            success: true,
        });

        principleToken = {
            minter: principleJettonMinter,
        };

        const yieldRandomSeed = Math.floor(Math.random() * 10000);
        const yieldJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    adminAddress: newMaster.address,
                    content: beginCell().storeUint(yieldRandomSeed, 256).endCell(),
                    jettonWalletCode: jettonWalletCode,
                },
                jettonMinterCode,
            ),
        );

        result = await yieldJettonMinter.sendDeploy(deployer.getSender(), toNano('0.01'));

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: yieldJettonMinter.address,
            deploy: true,
            success: true,
        });

        yieldToken = {
            minter: yieldJettonMinter,
        };
        await newMaster.sendMinderAddr({
            opCode: Opcodes.setPTMinderAddr,
            minderAddr: principleToken.minter.address,
            signFunc: (buf: Buffer) => sign(buf, kp.secretKey),
        });

        await newMaster.sendMinderAddr({
            opCode: Opcodes.setYTMinderAddr,
            minderAddr: yieldToken.minter.address,
            signFunc: (buf: Buffer) => sign(buf, kp.secretKey),
        });

        await newMaster.sendMasterTonAddr({
            opCode: Opcodes.setMasterTONAddr,
            masterTonAddr: await underlyingAsset.minter.getWalletAddress(newMaster.address),
            signFunc: (buf: Buffer) => sign(buf, kp.secretKey),
        });

        result = await supplyJetton(
            underlyingHolder,
            newMaster,
            underlyingAsset.wallet,
            amount,
            principleToken.minter,
            yieldToken.minter,
        );

        const userAddress = await newMaster.getWalletAddress(underlyingHolder.address);
        const userPrincipleWalletAddress = await principleToken.minter.getWalletAddress(underlyingHolder.address);
        const userYieldTokenWalletAddress = await yieldToken.minter.getWalletAddress(underlyingHolder.address);

        expect(result.transactions).toHaveTransaction({
            from: newMaster.address,
            to: userAddress,
            deploy: true,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: principleToken.minter.address,
            to: userPrincipleWalletAddress,
            deploy: true,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: yieldToken.minter.address,
            to: userYieldTokenWalletAddress,
            deploy: true,
            success: true,
        });

        const user = blockchain.openContract(User.createFromAddress(userAddress));

        await assertJettonBalanceEqual(blockchain, userPrincipleWalletAddress, amount);
        await assertJettonBalanceEqual(blockchain, userYieldTokenWalletAddress, amount);

        const userPrincipleWallet = blockchain.openContract(JettonWallet.createFromAddress(userPrincipleWalletAddress));
        const userYieldWallet = blockchain.openContract(JettonWallet.createFromAddress(userYieldTokenWalletAddress));

        const burnAmount = 100n;
        const redeemResult = await userPrincipleWallet.sendTransfer(underlyingHolder.getSender(), {
            value: toNano('0.5'),
            toAddress: userAddress,
            queryId: 113,
            jettonAmount: burnAmount,
            fwdAmount: toNano('0.4'),
            fwdPayload: beginCell()
                .storeUint(Opcodes.redeem, 32)
                .storeUint(114, 64)
                .storeAddress(await principleToken.minter.getWalletAddress(userAddress))
                .storeAddress(await yieldToken.minter.getWalletAddress(userAddress))
                .storeAddress(await underlyingAsset.minter.getWalletAddress(newMaster.address))
                .storeUint(0, 2)
                .endCell(),
        });

        expect(redeemResult.transactions).toHaveTransaction({
            from: underlyingHolder.address,
            to: userPrincipleWalletAddress,
            success: true,
        });

        expect(redeemResult.transactions).toHaveTransaction({
            from: userPrincipleWalletAddress,
            to: await principleToken.minter.getWalletAddress(userAddress),
            success: true,
            deploy: true,
        });

        expect(redeemResult.transactions).toHaveTransaction({
            from: await principleToken.minter.getWalletAddress(userAddress),
            to: userAddress,
            success: true,
        });

        expect(redeemResult.transactions).toHaveTransaction({
            from: userAddress,
            to: principleToken.minter.address,
            success: true,
        });

        expect(redeemResult.transactions).toHaveTransaction({
            from: principleToken.minter.address,
            to: userAddress,
            success: true,
        });

        expect(redeemResult.transactions).toHaveTransaction({
            from: userAddress,
            to: await principleToken.minter.getWalletAddress(userAddress),
            success: true,
        });
        const finishRedeemResult = await userYieldWallet.sendTransfer(underlyingHolder.getSender(), {
            value: toNano('0.5'),
            toAddress: userAddress,
            queryId: 115,
            jettonAmount: burnAmount,
            fwdAmount: toNano('0.4'),
            fwdPayload: beginCell()
                .storeUint(Opcodes.redeem, 32)
                .storeUint(116, 64)
                .storeAddress(await principleToken.minter.getWalletAddress(userAddress))
                .storeAddress(await yieldToken.minter.getWalletAddress(userAddress))
                .storeAddress(await underlyingAsset.minter.getWalletAddress(newMaster.address))
                .storeUint(1, 2)
                .endCell(),
        });

        expect(finishRedeemResult.transactions).toHaveTransaction({
            from: underlyingHolder.address,
            to: userYieldTokenWalletAddress,
            success: true,
        });

        expect(finishRedeemResult.transactions).toHaveTransaction({
            from: userYieldTokenWalletAddress,
            to: await yieldToken.minter.getWalletAddress(userAddress),
            success: true,
            deploy: true,
        });

        expect(finishRedeemResult.transactions).toHaveTransaction({
            from: await yieldToken.minter.getWalletAddress(userAddress),
            to: userAddress,
            success: true,
        });

        expect(finishRedeemResult.transactions).toHaveTransaction({
            from: userAddress,
            to: yieldToken.minter.address,
            success: true,
        });

        expect(finishRedeemResult.transactions).toHaveTransaction({
            from: yieldToken.minter.address,
            to: userAddress,
            success: true,
        });

        expect(finishRedeemResult.transactions).toHaveTransaction({
            from: userAddress,
            to: await yieldToken.minter.getWalletAddress(userAddress),
            success: true,
        });

        expect(finishRedeemResult.transactions).toHaveTransaction({
            from: userAddress,
            to: newMaster.address,
            success: true,
        });

        expect(finishRedeemResult.transactions).toHaveTransaction({
            from: newMaster.address,
            to: await underlyingAsset.minter.getWalletAddress(newMaster.address),
            success: true,
        });

        const underlyingHolderWallet = await underlyingAsset.minter.getWalletAddress(underlyingHolder.address);
        expect(finishRedeemResult.transactions).toHaveTransaction({
            from: await underlyingAsset.minter.getWalletAddress(newMaster.address),
            to: underlyingHolderWallet,
            success: true,
        });

        const underlyingJettonWallet = JettonWallet.createFromAddress(underlyingHolderWallet);
        const underlyingJetton = blockchain.openContract(underlyingJettonWallet);
        const balance = await underlyingJetton.getBalance();
        const expectedBalance = burnAmount / index + (1000n - amount);
        expect(balance).toEqual(expectedBalance);
    });
});
