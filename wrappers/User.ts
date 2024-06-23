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
    supplies: Dictionary<bigint, Cell>;
};

export type SupplyData = {
    fromAddress: Address | null;
    fromAmount: bigint;
    toAddress: Address | null;
    toAmount: bigint;
    toMasterAddress: Address | null;
};

export function userConfigToCell(config: UserConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        .storeAddress(config.masterContract)
        .storeDict(config.supplies)
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

    async getSupplies(provider: ContractProvider): Promise<Dictionary<bigint, SupplyData>> {
        let { stack } = await provider.get('get_supplies_data', []);
        let orders: Dictionary<bigint, SupplyData> = Dictionary.empty();
        const orders_cell = stack.readCellOpt();
        if (orders_cell) {
            orders = orders_cell?.beginParse().loadDictDirect(Dictionary.Keys.BigUint(256), supplyDataSerializer);
        }
        return orders;
    }
}

const supplyDataSerializer = {
    serialize: (src: SupplyData, builder: Builder) => {
        const val = beginCell()
            .storeAddress(src.fromAddress)
            .storeCoins(src.fromAmount)
            .storeAddress(src.toAddress)
            .storeCoins(src.toAmount)
            .storeAddress(src.toMasterAddress)
            .endCell();
        builder.storeRef(val);
    },

    parse: (src: Slice): SupplyData => {
        const val = src.loadRef().beginParse();
        const orderType = val.loadUint(8);
        const fromAddress = val.loadAddress();
        const fromAmount = BigInt(val.loadCoins());
        const toAddress = val.loadAddress();
        const toAmount = BigInt(val.loadCoins());
        const toMasterAddress = val.loadAddress();
        return { fromAddress, fromAmount, toAddress, toAmount, toMasterAddress };
    }
};