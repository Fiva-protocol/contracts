import {
    Address,
    beginCell, Builder,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode, Slice
} from '@ton/core';

export type UserConfig = {
    owner: Address;
    masterContract: Address;
    maturity: bigint;
};

export function userConfigToCell(config: UserConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        .storeAddress(config.masterContract)
        .storeUint(config.maturity, 32)
        .endCell();
}

export class User implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {
    }

    static createFromAddress(address: Address) {
        return new User(address);
    }

    static createFromConfig(config: UserConfig, code: Cell, workchain = 0) {
        const data = userConfigToCell(config);
        const init = { code, data };
        return new User(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell()
        });
    }

    async getMasterAddr(provider: ContractProvider) {
        const result = await provider.get('get_master_addr', []);
        return result.stack.readAddress();
    }

    async getMaturity(provider: ContractProvider) {
        const result = await provider.get('get_maturity', []);
        return result.stack.readBigNumber();
    }
}