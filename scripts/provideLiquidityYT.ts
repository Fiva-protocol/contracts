import { Asset, Factory } from '@dedust/sdk';
import { JettonRoot, PoolType, VaultJetton } from '@dedust/sdk';
import { toNano } from '@ton/core';
import { Address, TonClient4 } from '@ton/ton';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tsTONAmount = toNano('5'); 
    const YTAmount = toNano('5'); 

    const tsTONAddress = Address.parse('kQCwR07mEDg22t_TYI1oXrb5lRkRUBtmJSjpKGdw_TL2B4yf');
    const tsTON = Asset.jetton(tsTONAddress);
    // Address of a new jetton
    const YTAddress = Address.parse('EQDsmCkmupqZ9mKad3BMQg-LEI5Br5PV0pBZvAH11_Du-xcW');
    const YT = Asset.jetton(YTAddress);

    const assets: [Asset, Asset] = [tsTON, YT];
    const targetBalances: [bigint, bigint] = [tsTONAmount, YTAmount];

    const FACTORY_TESTNET_ADDR = Address.parse('EQDHcPxlCOSN_s-Vlw53bFpibNyKpZHV6xHhxGAAT_21nCFU'); // Added Dedust Factory address
    const tonClient = new TonClient4({ endpoint: 'https://sandbox-v4.tonhubapi.com' }); //https://mainnet-v4.tonhubapi.com
    const factory = tonClient.open(Factory.createFromAddress(FACTORY_TESTNET_ADDR)); //changed to testnet


    const tsTONVault = tonClient.open(await factory.getJettonVault(tsTONAddress));
    const YTVault = tonClient.open(await factory.getJettonVault(YTAddress));

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


    const YTRoot = tonClient.open(JettonRoot.createFromAddress(YTAddress));
    const YTWallet = tonClient.open(await YTRoot.getWallet(provider.sender().address!));

    await YTWallet.sendTransfer(provider.sender(), toNano('0.6'), {
        amount: YTAmount,
        destination: YTVault.address,
        responseAddress: provider.sender().address,
        forwardAmount: toNano('0.5'),
        forwardPayload: VaultJetton.createDepositLiquidityPayload({
            poolType: PoolType.VOLATILE,
            assets,
            targetBalances
        })
    });
}