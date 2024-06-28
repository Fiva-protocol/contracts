import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { TupleItemSlice } from '@ton/core/dist/tuple/tuple';

export type MasterConfig = {
    admin: Address;
    userCode: Cell;
    maturity: bigint;
    index: bigint;
    pubKey: Buffer;
};

export function masterConfigToCell(config: MasterConfig): Cell {
    return beginCell()
        .storeAddress(config.admin)
        .storeRef(config.userCode)
        .storeUint(config.maturity, 32)
        .storeUint(config.index, 32)
        .storeBuffer(config.pubKey)
        .endCell();
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

    async getIndex(provider: ContractProvider) {
        const result = await provider.get('get_index', []);
        return result.stack.readBigNumber();
    }

    async sendExternalMessage(
        provider: ContractProvider,
        opts: {
            opCode: number,
            index: bigint,
            signFunc: (buf: Buffer) => Buffer;
        }
    ) {
        const msgToSign = beginCell()
            .storeUint(opts.opCode, 32)
            .storeUint(opts.index, 32)
            .endCell();

        const signature = opts.signFunc(msgToSign.hash());

        await provider.external(
            beginCell()
                .storeBuffer(signature)
                .storeSlice(msgToSign.asSlice())
                .endCell()
        );
    }
}
