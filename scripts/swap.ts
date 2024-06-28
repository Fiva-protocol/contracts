import { Asset,PoolType,ReadinessStatus,Factory  } from '@dedust/sdk';
import { Address, TonClient4 } from "@ton/ton";
import { toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';

// ...
export async function run(provider: NetworkProvider) {
    // NOTE: We will use tonVault to send a message.
    const FACTORY_TESTNET_ADDR = Address.parse('EQDHcPxlCOSN_s-Vlw53bFpibNyKpZHV6xHhxGAAT_21nCFU'); // Added Dedust Factory address
    const tonClient = new TonClient4({ endpoint: "https://sandbox-v4.tonhubapi.com" }); //https://mainnet-v4.tonhubapi.com
    const factory = tonClient.open(Factory.createFromAddress(FACTORY_TESTNET_ADDR)); //changed to testnet

    const tonVault = tonClient.open(await factory.getNativeVault());
    const YTAddress = Address.parse('EQAAfs9rz_XkIcM-Cu4dxSy-fXTeZPHjKXQFsDHQpXjeMV7X');

    const TON = Asset.native();
    const YT = Asset.jetton(YTAddress);

    const pool = tonClient.open(await factory.getPool(PoolType.VOLATILE, [TON, YT]));

    // Check if pool exists:
    if ((await pool.getReadinessStatus()) !== ReadinessStatus.READY) {
        throw new Error('Pool (TON, YT) does not exist.');
    }
    
    // Check if vault exits:
    if ((await tonVault.getReadinessStatus()) !== ReadinessStatus.READY) {
        throw new Error('Vault (TON) does not exist.');
};
    const amountIn = toNano('0.1'); // 5 TON

    await tonVault.sendSwap(provider.sender(), {
    poolAddress: pool.address,
    amount: amountIn,
    gasAmount: toNano("0.25"),
    });
}
