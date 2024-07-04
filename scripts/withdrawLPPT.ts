import { Asset, Factory } from '@dedust/sdk';
import { JettonRoot, PoolType, VaultJetton } from '@dedust/sdk';
import { toNano } from '@ton/core';
import { Address, TonClient4 } from "@ton/ton";
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const FACTORY_TESTNET_ADDR = Address.parse('EQDHcPxlCOSN_s-Vlw53bFpibNyKpZHV6xHhxGAAT_21nCFU'); 
    const tonClient = new TonClient4({ endpoint: "https://sandbox-v4.tonhubapi.com" }); 
    const factory = tonClient.open(Factory.createFromAddress(FACTORY_TESTNET_ADDR)); 
    const tsTONAddress = Address.parse('kQCwR07mEDg22t_TYI1oXrb5lRkRUBtmJSjpKGdw_TL2B4yf');
    const tsTON = Asset.jetton(tsTONAddress);

    const PTAddress = Address.parse('EQDrQ70VeQ1X8xzszOHVRLq7tAMDrSnPY54O0VKGxZSkAESK');
    const PT = Asset.jetton(PTAddress);

    const pool = tonClient.open(await factory.getPool(PoolType.VOLATILE, [tsTON, PT]));
    const lpWallet = tonClient.open(await pool.getWallet(provider.sender().address!));

    await lpWallet.sendBurn(provider.sender(), toNano('2'), {
    amount: await lpWallet.getBalance(),
    });
};