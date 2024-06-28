import { Asset, Factory } from '@dedust/sdk';
import { JettonRoot, PoolType, VaultJetton } from '@dedust/sdk';
import { toNano } from '@ton/core';
import { Address, TonClient4 } from "@ton/ton";
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const FACTORY_TESTNET_ADDR = Address.parse('EQDHcPxlCOSN_s-Vlw53bFpibNyKpZHV6xHhxGAAT_21nCFU'); // Added Dedust Factory address
    const tonClient = new TonClient4({ endpoint: "https://sandbox-v4.tonhubapi.com" }); //https://mainnet-v4.tonhubapi.com
    const factory = tonClient.open(Factory.createFromAddress(FACTORY_TESTNET_ADDR)); //changed to testnet
    const TON = Asset.native();
    // Address of a new jetton
    const YTAddress = Address.parse('EQAAfs9rz_XkIcM-Cu4dxSy-fXTeZPHjKXQFsDHQpXjeMV7X');
    const YT = Asset.jetton(YTAddress);
    const pool = tonClient.open(await factory.getPool(PoolType.VOLATILE, [TON, YT]));
    const lpWallet = tonClient.open(await pool.getWallet(provider.sender().address!));

    await lpWallet.sendBurn(provider.sender(), toNano('0.5'), {
    amount: await lpWallet.getBalance(),
    });
};