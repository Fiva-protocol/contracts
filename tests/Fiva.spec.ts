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

        fiva = blockchain.openContract(Fiva.createFromConfig({seqno: 0}, code));

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

    it('should accept deposit', async () => {
        const sender = await blockchain.treasury('sender');

        const depositResult = await fiva.sendDeposit(sender.getSender(), toNano('2.0'));
        expect(depositResult.transactions).toHaveTransaction({
            from: sender.address,
            to: fiva.address,
            success: true,
        });

        const balance = await fiva.getBalance();
        expect(balance).toBeGreaterThan(toNano('1.99'));
    });
});
