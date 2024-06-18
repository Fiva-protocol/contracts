import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { PrincipleToken } from '../wrappers/PrincipleToken';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('PrincipleToken', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('PrincipleToken');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let principleToken: SandboxContract<PrincipleToken>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        principleToken = blockchain.openContract(PrincipleToken.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await principleToken.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: principleToken.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and principleToken are ready to use
    });
});
