import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { Master } from '../wrappers/Master';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { assertJettonBalanceEqual, deployJettonWithWallet, setupMaster, supplyJetton } from './helper';

describe('Master', () => {
    let masterCode: Cell;
    let userCode: Cell;
    let jettonMinterCode: Cell;
    let jettonWalletCode: Cell;

    beforeAll(async () => {
        masterCode = await compile('Master');
        userCode = await compile('User');
        jettonMinterCode = await compile('JettonMinter');
        jettonWalletCode = await compile('JettonWallet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let underlyingHolder: SandboxContract<TreasuryContract>;
    let master: SandboxContract<Master>;

    let principleToken: {
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

        master = await setupMaster(blockchain, deployer, masterCode, userCode);

        underlyingAsset = await deployJettonWithWallet(
            blockchain,
            deployer,
            jettonMinterCode,
            jettonWalletCode,
            underlyingHolder.address,
            100n
        );

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

        const result = await jettonMinter.sendDeploy(deployer.getSender(), toNano('0.01'));

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonMinter.address,
            deploy: true,
            success: true
        });

        principleToken = {
            minter: jettonMinter
        };
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and master are ready to use
    });

    it('should mint principle token', async () => {
        const amount = 10n;

        const result = await supplyJetton(underlyingHolder, master, underlyingAsset.wallet, amount, principleToken.minter);

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

        const user_address = await master.getWalletAddress(underlyingHolder.address);
        // Master -> User Order
        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: user_address,
            deploy: true,
            success: true
        });

        // Master -> Master Order Jetton1 Wallet
        expect(result.transactions).toHaveTransaction({
            from: master.address,
            to: jetton_wallet_master,
            success: true
        });

        const jetton_wallet_user = await underlyingAsset.minter.getWalletAddress(user_address);
        // Master Order Jetton1 Wallet -> User Order Jetton1 Wallet
        expect(result.transactions).toHaveTransaction({
            from: jetton_wallet_master,
            to: jetton_wallet_user,
            deploy: true,
            success: true
        });

        // Jettons are in User Order Wallet
        await assertJettonBalanceEqual(blockchain, jetton_wallet_master, 0n);
        await assertJettonBalanceEqual(blockchain, jetton_wallet_user, amount);

        // await assertJettonBalanceEqual(blockchain, user_principle_token_address, amount);
    });
});

