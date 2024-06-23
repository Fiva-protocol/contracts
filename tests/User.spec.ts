import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { User } from '../wrappers/User';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Master } from '../wrappers/Master';
import { assertJettonBalanceEqual, deployJettonWithWallet, setupMaster } from './helper';


describe('User', () => {
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
    let creator: SandboxContract<TreasuryContract>;
    let user: SandboxContract<User>;
    let master: SandboxContract<Master>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        creator = await blockchain.treasury('creator');

        master = await setupMaster(blockchain, deployer, masterCode, userCode);

        // user = blockchain.openContract(User.createFromAddress(await master.getWalletAddress(creator.address)),);

        // expect((await user.getSupplies())?.keys().length).toEqual(1);
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and user are ready to use
    });
});
