import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { User } from '../wrappers/User';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('User', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('User');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user: SandboxContract<User>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        user = blockchain.openContract(User.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await user.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: user.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and user are ready to use
    });
});
