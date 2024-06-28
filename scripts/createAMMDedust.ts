import { Factory, MAINNET_FACTORY_ADDR, Vault } from '@dedust/sdk';
import { Address, TonClient4, address } from "@ton/ton";
import { Asset, PoolType, ReadinessStatus } from '@dedust/sdk';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
  const FACTORY_TESTNET_ADDR = Address.parse('EQDHcPxlCOSN_s-Vlw53bFpibNyKpZHV6xHhxGAAT_21nCFU'); // Added Dedust Factory address

  const tonClient = new TonClient4({ endpoint: "https://sandbox-v4.tonhubapi.com" }); //https://mainnet-v4.tonhubapi.com
  const factory = tonClient.open(Factory.createFromAddress(FACTORY_TESTNET_ADDR)); //changed to testnet


  // You can do it using the SDK or by manually sending the create_vault message (TL-B) to the Factory contract.

  // Address of a new jetton
  const YTAddress = Address.parse('EQAAfs9rz_XkIcM-Cu4dxSy-fXTeZPHjKXQFsDHQpXjeMV7X');

  // Create a vault
  await factory.sendCreateVault(provider.sender(), {
    asset: Asset.jetton(YTAddress),
  });

  const TON = Asset.native();
  const YT = Asset.jetton(Address.parse('EQAAfs9rz_XkIcM-Cu4dxSy-fXTeZPHjKXQFsDHQpXjeMV7X'));

  const pool = tonClient.open(
    await factory.getPool(PoolType.VOLATILE, [TON, YT]),
  );

  const poolReadiness = await pool.getReadinessStatus();

  if (poolReadiness === ReadinessStatus.NOT_DEPLOYED) {
    await factory.sendCreateVolatilePool(provider.sender(), {
      assets: [TON, YT],
    });
  }

  console.log ('Pools address :', pool.address)
  console.log ('YT Vault address:', await factory.getVaultAddress(YT))
  console.log ('Factory Contract:', factory.address)
}