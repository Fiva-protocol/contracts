import { Factory} from '@dedust/sdk';
import { Address, TonClient4, address } from "@ton/ton";
import { Asset, PoolType, ReadinessStatus } from '@dedust/sdk';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
  const FACTORY_TESTNET_ADDR = Address.parse('EQDHcPxlCOSN_s-Vlw53bFpibNyKpZHV6xHhxGAAT_21nCFU'); 
  const tonClient = new TonClient4({ endpoint: "https://sandbox-v4.tonhubapi.com" }); 
  const factory = tonClient.open(Factory.createFromAddress(FACTORY_TESTNET_ADDR)); 

  const PTAddress = Address.parse('EQDrQ70VeQ1X8xzszOHVRLq7tAMDrSnPY54O0VKGxZSkAESK');
  const tsTONAddress = Address.parse('kQCwR07mEDg22t_TYI1oXrb5lRkRUBtmJSjpKGdw_TL2B4yf');

  // Create a vault PT
  await factory.sendCreateVault(provider.sender(), {
    asset: Asset.jetton(PTAddress),
  });
  // Create a vault tston
  await factory.sendCreateVault(provider.sender(), {
    asset: Asset.jetton(tsTONAddress),
  });

  const tsTON = Asset.jetton(tsTONAddress);
  const PT = Asset.jetton(PTAddress);

  const pool = tonClient.open(
    await factory.getPool(PoolType.VOLATILE, [tsTON, PT]),
  );

  const poolReadiness = await pool.getReadinessStatus();

  if (poolReadiness === ReadinessStatus.NOT_DEPLOYED) {
    await factory.sendCreateVolatilePool(provider.sender(), {
      assets: [tsTON, PT],
    });
  }

  console.log ('Pools address :', pool.address)
  console.log ('PT Vault address:', await factory.getVaultAddress(PT))
  console.log ('Tston Vault address:', await factory.getVaultAddress(tsTON))
  console.log ('Factory Contract:', factory.address)
}