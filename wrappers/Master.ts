import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type MasterConfig = {};

export function masterConfigToCell(config: MasterConfig): Cell {
    return beginCell().endCell();
}

export class Master implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Master(address);
    }

    static createFromConfig(config: MasterConfig, code: Cell, workchain = 0) {
        const data = masterConfigToCell(config);
        const init = { code, data };
        return new Master(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
