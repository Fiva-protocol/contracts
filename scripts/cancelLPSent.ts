import { Asset, Factory } from '@dedust/sdk';
import { PoolType } from '@dedust/sdk';
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
    const assets: [Asset, Asset] = [TON, YT];

    const liquidityDeposit = tonClient.open(
        await factory.getLiquidityDeposit({
          ownerAddress: provider.sender().address!,
          poolType: PoolType.VOLATILE,
          assets: assets,
        }),
      );
      
      await liquidityDeposit.sendCancelDeposit(provider.sender(), {});;
};