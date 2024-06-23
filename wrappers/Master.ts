import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { TupleItemSlice } from '@ton/core/dist/tuple/tuple';

export type MasterConfig = {
    admin: Address;
    userCode: Cell;
};

export function masterConfigToCell(config: MasterConfig): Cell {
    return beginCell().storeAddress(config.admin).storeRef(config.userCode).endCell();
}

export class Master implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

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
            body: beginCell().endCell()
        });
    }

    async getWalletAddress(provider: ContractProvider, address: Address) {
        const result = await provider.get('get_wallet_address', [
            {
                type: 'slice',
                cell: beginCell().storeAddress(address).endCell()
            } as TupleItemSlice
        ]);

        return result.stack.readAddress();
    }
}
