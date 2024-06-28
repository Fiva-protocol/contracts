import { Asset, Factory } from '@dedust/sdk';
import { JettonRoot, PoolType, VaultJetton } from '@dedust/sdk';
import { toNano } from '@ton/core';
import { Address, TonClient4 } from "@ton/ton";
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonAmount = toNano("0.5"); // 0.5 TON
    const YTAmount = toNano("100"); // 100 YT

    const TON = Asset.native();
    // Address of a new jetton
    const YTAddress = Address.parse('EQAAfs9rz_XkIcM-Cu4dxSy-fXTeZPHjKXQFsDHQpXjeMV7X');
    const YT = Asset.jetton(YTAddress);

    const assets: [Asset, Asset] = [TON, YT];
    const targetBalances: [bigint, bigint] = [tonAmount, YTAmount];

    const FACTORY_TESTNET_ADDR = Address.parse('EQDHcPxlCOSN_s-Vlw53bFpibNyKpZHV6xHhxGAAT_21nCFU'); // Added Dedust Factory address
    const tonClient = new TonClient4({ endpoint: "https://sandbox-v4.tonhubapi.com" }); //https://mainnet-v4.tonhubapi.com
    const factory = tonClient.open(Factory.createFromAddress(FACTORY_TESTNET_ADDR)); //changed to testnet


    const tonVault = tonClient.open(await factory.getNativeVault());
    const YTVault = tonClient.open(await factory.getJettonVault(YTAddress));


    // await tonVault.sendDepositLiquidity(provider.sender(), {
    // amount: tonAmount,
    // poolType: PoolType.VOLATILE,
    // assets: assets,
    // minimalLPAmount: 10n,
    // targetBalances,
    // fulfillPayload:null,
    // rejectPayload:null,    
    // });
    const user_address = provider.sender().address;

    const liquidity_address = await factory.getLiquidityDepositAddress({
        ownerAddress: user_address!, // Adjusted property name
        poolType: PoolType.VOLATILE,
        assets: assets} )

    
    console.log('YT value address check:', YTVault.address)
    console.log('TON value address check:', tonVault.address)
    console.log('Liquidity Provider Address:', liquidity_address)
    console.log('Pool address:',await factory.getPoolAddress({
        poolType:PoolType.VOLATILE,
        assets:assets,
    }))

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
        targetBalances,
    }),
    });
}