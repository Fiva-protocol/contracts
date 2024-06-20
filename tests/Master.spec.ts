import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Master } from '../wrappers/Master';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { deployJettonWithWallet } from './helper';

describe('Master', () => {
    let code: Cell;
    let principleTokenMinterCode: Cell;
    let principleTokenWalletCode: Cell;

    beforeAll(async () => {
        code = await compile('Master');
        principleTokenMinterCode = await compile('JettonMinter');
        principleTokenWalletCode = await compile('JettonWallet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let creator: SandboxContract<TreasuryContract>;
    let master: SandboxContract<Master>;

    let principleToken: {
        minter: SandboxContract<JettonMinter>;
        wallet: SandboxContract<JettonWallet>;
    };

    let stakedTON: {
        minter: SandboxContract<JettonMinter>;
        wallet: SandboxContract<JettonWallet>;
    };


    beforeEach(async () => {
        blockchain = await Blockchain.create();

        master = blockchain.openContract(Master.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');
        creator = await blockchain.treasury('creator');

        const deployResult = await master.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: master.address,
            deploy: true,
            success: true
        });

        principleToken = await deployJettonWithWallet(
            blockchain,
            deployer,
            principleTokenMinterCode,
            principleTokenWalletCode,
            creator.address,
            100n
        );

        principleToken = await deployJettonWithWallet(
            blockchain,
            deployer,
            principleTokenMinterCode,
            principleTokenWalletCode,
            creator.address,
            100n
        );
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and master are ready to use
    });
});
