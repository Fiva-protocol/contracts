import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Fiva } from '../wrappers/Fiva';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Fiva', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Fiva');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let fiva: SandboxContract<Fiva>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        fiva = blockchain.openContract(Fiva.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await fiva.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: fiva.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and fiva are ready to use
    });
});
