import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { Opcodes } from '../helpers/Opcodes';

export type FivaConfig = {
    seqno: number
};

export function fivaConfigToCell(config: FivaConfig): Cell {
    return beginCell().storeUint(config.seqno, 32).endCell();
}

export class Fiva implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Fiva(address);
    }

    static createFromConfig(config: FivaConfig, code: Cell, workchain = 0) {
        const data = fivaConfigToCell(config);
        const init = { code, data };
        return new Fiva(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeposit(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(Opcodes.deposit, 32)
                .endCell(),
        });
    }

    async getBalance(provider: ContractProvider): Promise<number> {
        const result = await provider.get('get_smc_balance', []);
        return result.stack.readNumber();
    }

    async getSeqno(provider: ContractProvider): Promise<number> {
        const result = await provider.get('get_seqno', []);
        return result.stack.readNumber();
    }
}
