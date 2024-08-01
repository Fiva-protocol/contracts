import { Asset, PoolType, ReadinessStatus, Factory, JettonRoot, VaultJetton } from '@dedust/sdk';
import { Address, TonClient4 } from '@ton/ton';
import { toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const FACTORY_TESTNET_ADDR = Address.parse('EQDHcPxlCOSN_s-Vlw53bFpibNyKpZHV6xHhxGAAT_21nCFU');
    const tonClient = new TonClient4({ endpoint: 'https://sandbox-v4.tonhubapi.com' });
    const factory = tonClient.open(Factory.createFromAddress(FACTORY_TESTNET_ADDR));

    const PTAddress = Address.parse('EQDrQ70VeQ1X8xzszOHVRLq7tAMDrSnPY54O0VKGxZSkAESK');
    const tsTONAddress = Address.parse('kQCwR07mEDg22t_TYI1oXrb5lRkRUBtmJSjpKGdw_TL2B4yf');

    const tsTON = Asset.jetton(tsTONAddress);
    const PT = Asset.jetton(PTAddress);

    const pool = tonClient.open(await factory.getPool(PoolType.VOLATILE, [tsTON, PT]));

    // Check if pool exists:
    if ((await pool.getReadinessStatus()) !== ReadinessStatus.READY) {
        throw new Error('Pool (tsTON, YT) does not exist.');
    }

    const amountIn = toNano('1');

    const tsTONVault = tonClient.open(await factory.getJettonVault(tsTONAddress));
    const tsTONRoot = tonClient.open(JettonRoot.createFromAddress(tsTONAddress));
    const tsTONWallet = tonClient.open(await tsTONRoot.getWallet(provider.sender().address!));
    const poolAddress = Address.parse('EQDJX39iVmy_pqeYjO47vdT7rYNiYYGzf8f_5duv-4vuYoDW');
    await tsTONWallet.sendTransfer(provider.sender(), toNano('0.3'), {
        amount: amountIn,
        destination: tsTONVault.address,
        responseAddress: provider.sender().address,
        forwardAmount: toNano('0.25'),
        forwardPayload: VaultJetton.createSwapPayload({ poolAddress }),
    });
}
