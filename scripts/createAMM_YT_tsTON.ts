import { Factory} from '@dedust/sdk';
import { Address, TonClient4, address } from "@ton/ton";
import { Asset, PoolType, ReadinessStatus } from '@dedust/sdk';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
  const FACTORY_TESTNET_ADDR = Address.parse('EQDHcPxlCOSN_s-Vlw53bFpibNyKpZHV6xHhxGAAT_21nCFU'); // Added Dedust Factory address

  const tonClient = new TonClient4({ endpoint: "https://sandbox-v4.tonhubapi.com" }); //https://mainnet-v4.tonhubapi.com
  const factory = tonClient.open(Factory.createFromAddress(FACTORY_TESTNET_ADDR)); //changed to testnet


  // You can do it using the SDK or by manually sending the create_vault message (TL-B) to the Factory contract.

  // Address of a new jetton
  const YTAddress = Address.parse('EQDsmCkmupqZ9mKad3BMQg-LEI5Br5PV0pBZvAH11_Du-xcW');
  const tsTONAddress = Address.parse('kQCwR07mEDg22t_TYI1oXrb5lRkRUBtmJSjpKGdw_TL2B4yf');

  // Create a vault
  await factory.sendCreateVault(provider.sender(), {
    asset: Asset.jetton(YTAddress),
  });

  const tsTON = Asset.jetton(tsTONAddress);
  const YT = Asset.jetton(YTAddress);

  const pool = tonClient.open(
    await factory.getPool(PoolType.VOLATILE, [tsTON, YT]),
  );

  const poolReadiness = await pool.getReadinessStatus();

  if (poolReadiness === ReadinessStatus.NOT_DEPLOYED) {
    await factory.sendCreateVolatilePool(provider.sender(), {
      assets: [tsTON, YT],
    });
  }

  console.log ('tsTON/YT Pool address :', pool.address)
  console.log ('YT Vault address:', await factory.getVaultAddress(YT))
  console.log ('Factory Contract:', factory.address)
}