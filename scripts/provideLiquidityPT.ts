import { Asset, Factory } from '@dedust/sdk';
import { JettonRoot, PoolType, VaultJetton } from '@dedust/sdk';
import { toNano } from '@ton/core';
import { Address, TonClient4 } from '@ton/ton';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tsTONAmount = toNano('5'); 
    const PTAmount = toNano('5'); 

    const tsTONAddress = Address.parse('kQCwR07mEDg22t_TYI1oXrb5lRkRUBtmJSjpKGdw_TL2B4yf');
    const tsTON = Asset.jetton(tsTONAddress);
    const PTAddress = Address.parse('EQDrQ70VeQ1X8xzszOHVRLq7tAMDrSnPY54O0VKGxZSkAESK');
    const PT = Asset.jetton(PTAddress);

    const assets: [Asset, Asset] = [tsTON, PT];
    const targetBalances: [bigint, bigint] = [tsTONAmount, PTAmount];

    const FACTORY_TESTNET_ADDR = Address.parse('EQDHcPxlCOSN_s-Vlw53bFpibNyKpZHV6xHhxGAAT_21nCFU'); 
    const tonClient = new TonClient4({ endpoint: 'https://sandbox-v4.tonhubapi.com' }); 
    const factory = tonClient.open(Factory.createFromAddress(FACTORY_TESTNET_ADDR)); 


    const tsTONVault = tonClient.open(await factory.getJettonVault(tsTONAddress));
    const PTVault = tonClient.open(await factory.getJettonVault(PTAddress));

    const tsTONRoot = tonClient.open(JettonRoot.createFromAddress(tsTONAddress));
    const tsTONWallet = tonClient.open(await tsTONRoot.getWallet(provider.sender().address!));

    await tsTONWallet.sendTransfer(provider.sender(), toNano('0.6'), {
        amount: tsTONAmount,
        destination: tsTONVault.address,
        responseAddress: provider.sender().address,
        forwardAmount: toNano('0.5'),
        forwardPayload: VaultJetton.createDepositLiquidityPayload({
            poolType: PoolType.VOLATILE,
            assets,
            targetBalances
        })
    });
    

    const PTRoot = tonClient.open(JettonRoot.createFromAddress(PTAddress));
    const PTWallet = tonClient.open(await PTRoot.getWallet(provider.sender().address!));

    await PTWallet.sendTransfer(provider.sender(), toNano('0.6'), {
        amount: PTAmount,
        destination: PTVault.address,
        responseAddress: provider.sender().address,
        forwardAmount: toNano('0.5'),
        forwardPayload: VaultJetton.createDepositLiquidityPayload({
            poolType: PoolType.VOLATILE,
            assets,
            targetBalances
        })
    });
}