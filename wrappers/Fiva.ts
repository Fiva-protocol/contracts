import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type FivaConfig = {};

export function fivaConfigToCell(config: FivaConfig): Cell {
    return beginCell().endCell();
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
}
