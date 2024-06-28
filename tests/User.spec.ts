import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { User } from '../wrappers/User';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Master } from '../wrappers/Master';
import { deployJettonWithWallet, generateKP, setupMaster, supplyJetton } from './helper';
import { KeyPair } from 'ton-crypto';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';


describe('User', () => {
    let masterCode: Cell;
    let userCode: Cell;
    let jettonMinterCode: Cell;
    let jettonWalletCode: Cell;
    let kp: KeyPair;
    let index = 99n;
    let maturity = 1000n;

    beforeAll(async () => {
        masterCode = await compile('Master');
        userCode = await compile('User');
        jettonMinterCode = await compile('JettonMinter');
        jettonWalletCode = await compile('JettonWallet');

        kp = await generateKP();
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let creator: SandboxContract<TreasuryContract>;
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
        creator = await blockchain.treasury('creator');
        underlyingHolder = await blockchain.treasury('underlying holder');

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

        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: userAddress,
            deploy: true,
            success: true
        });

        const user = blockchain.openContract(User.createFromAddress(userAddress));
        const indexFromContract = await user.getIndex();
        expect(indexFromContract).toEqual(0n);
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
        expect(indexFromContract).toEqual(0n);
    });
});
