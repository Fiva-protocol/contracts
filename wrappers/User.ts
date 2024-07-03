import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode
} from '@ton/core';
import { Opcodes } from '../helpers/Opcodes';

export type UserConfig = {
    owner: Address;
    masterContract: Address;
    maturity: bigint;
    index: bigint,
    interest: bigint,
    ytBalance: bigint,
    burn: Cell
};

export function userConfigToCell(config: UserConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        .storeAddress(config.masterContract)
        .storeUint(config.maturity, 32)
        .storeUint(config.index, 32)
        .storeUint(config.interest, 32)
        .storeCoins(config.ytBalance)
        .storeRef(config.burn)
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

    // async sendRedeem(
    //     provider: ContractProvider,
    //     via: Sender,
    //     opts: {
    //         value: bigint;
    //         queryId: number;
    //         jettonAmount: bigint,
    //         masterWalletAddr: Address,
    //         principleTokenAddr: Address,
    //         yieldTokenAddr: Address,
    //         fwdPayload: Cell;
    //     }
    // ) {
    //     await provider.internal(via, {
    //             value: opts.value,
    //             sendMode: SendMode.PAY_GAS_SEPARATELY,
    //             body: beginCell()
    //                 .storeUint(Opcodes.redeem, 32)
    //                 .storeUint(opts.queryId, 64)
    //                 .storeCoins(opts.jettonAmount)
    //                 .storeAddress(via.address)
    //                 .storeUint(0, 1)
    //                 .storeAddress(opts.principleTokenAddr)
    //                 .storeAddress(opts.yieldTokenAddr)
    //                 .storeUint(0, 1)
    //                 .storeRef(beginCell().storeAddress(opts.masterWalletAddr).endCell())
    //                 .endCell()
    //         }
    //     );
    // }

    async getMasterAddr(provider: ContractProvider) {
        const result = await provider.get('get_master_addr', []);
        return result.stack.readAddress();
    }

    async getMaturity(provider: ContractProvider) {
        const result = await provider.get('get_maturity', []);
        return result.stack.readBigNumber();
    }

    async getIndex(provider: ContractProvider) {
        const result = await provider.get('get_index', []);
        return result.stack.readBigNumber();
    }

    async getInterest(provider: ContractProvider) {
        const result = await provider.get('get_interest', []);
        return result.stack.readBigNumber();
    }
}