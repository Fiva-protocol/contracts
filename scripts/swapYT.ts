import { Asset, PoolType, ReadinessStatus, Factory, JettonRoot, VaultJetton} from '@dedust/sdk';
import { Address, TonClient4 } from "@ton/ton";
import { toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';

// ...
export async function run(provider: NetworkProvider) {
    // NOTE: We will use tonVault to send a message.
    const FACTORY_TESTNET_ADDR = Address.parse('EQDHcPxlCOSN_s-Vlw53bFpibNyKpZHV6xHhxGAAT_21nCFU'); // Added Dedust Factory address
    const tonClient = new TonClient4({ endpoint: "https://sandbox-v4.tonhubapi.com" }); //https://mainnet-v4.tonhubapi.com
    const factory = tonClient.open(Factory.createFromAddress(FACTORY_TESTNET_ADDR)); //changed to testnet
    
    const YTAddress = Address.parse('EQDsmCkmupqZ9mKad3BMQg-LEI5Br5PV0pBZvAH11_Du-xcW');
    const tsTONAddress = Address.parse('kQCwR07mEDg22t_TYI1oXrb5lRkRUBtmJSjpKGdw_TL2B4yf');


    const tsTON = Asset.jetton(tsTONAddress);
    const YT = Asset.jetton(YTAddress);

    const pool = tonClient.open(await factory.getPool(PoolType.VOLATILE, [tsTON, YT]));

    // Check if pool exists:
    if ((await pool.getReadinessStatus()) !== ReadinessStatus.READY) {
        throw new Error('Pool (tsTON, YT) does not exist.');
    }
    
    // Check if vault exits:
//     if ((await tonVault.getReadinessStatus()) !== ReadinessStatus.READY) {
//         throw new Error('Vault (TON) does not exist.');
// };
    const amountIn = toNano('1'); 

    const tsTONVault = tonClient.open(await factory.getJettonVault(tsTONAddress));
    const tsTONRoot = tonClient.open(JettonRoot.createFromAddress(tsTONAddress));
    const tsTONWallet = tonClient.open(await tsTONRoot.getWallet(provider.sender().address!));
    const poolAddress = Address.parse('EQD-7e2KmGadNWp0-QdpTJAkpzBKC9E3e1-zG6Y6_tVzuSwM');
    await tsTONWallet.sendTransfer(provider.sender(), toNano("0.3"), {
        amount: amountIn,
        destination: tsTONVault.address,
        responseAddress: provider.sender().address, // return gas to user
        forwardAmount: toNano("0.25"),
        forwardPayload: VaultJetton.createSwapPayload({ poolAddress }),
      });
}
