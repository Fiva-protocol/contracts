# FIVA contracts

This repository contains the two main contracts that are the cornerstone of the FIVA protocol: the Master Contract and the User Order Contract. Additionally, the project includes tests for these contracts and scripts. The scripts are used for deploying smart contracts and creating Vaults and Pools (AMMs) using the Dedust SDK.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

## Master Contract

The master contract for the FIVA protocol is written in FunC. The contract includes functions and methods to yield tokenization, minting of Principal Tokens (PT) and Yield Tokens (YT) and redeeming them from protocol. Each assets will have separate Master Contract for decided maturity, since for yield stripping defined timeline is needed. 

### Key Features

- **Minting Functions**: Methods to mint user contracts, principal tokens (PT), and yield tokens (YT).
- **Interest Management**: Functions to claim and calculate user's interest.
- **Tokenization**: Facilitates the division of yield-bearing assets into PT and YT.
- **Redeeming and Notifications**: Functions to handle redeeming of tokens processing.

### Storage Structure

- **Admin Address**: The address of the contract administrator.
- **User Order Code**: Stores user-contract order codes.
- **Underlying Asset Addresses**: Stores addresses related to underlying assets and their wallets.
- **Meta Data**: Stores metadata including maturity dates, indices, and public keys.
- **Tokens Data**: Stores information related to tokens.

### Functions

#### Minting

- `mint_user_contract()`: Mints a user contract, which stored information about the user for this pool. Created for each user who participate in the protocol
- `mint_principle_token()`: Mints principal tokens.
- `mint_yield_token()`: Mints yield tokens.
- `send_ytbalance_index_to_user()`: Sends the yield token balance and index to a user contract.

#### Interest Management

- `claim_interest()`: Claims interest from the usser contract and send updated index for correct interest calcualtion to the user contract.
- `send_interest()`: Sends transfer opcode to the Master Jetton wallet of yield bearing asset (for example tsTON Master's Jetton Wallet), which finilize transfer to the user of the claimed interest.

#### Redeem

- `redeem()`: Redeems YT/PT tokens to a specified address and send yield bearing asset in return. For example user redeem YT tsTON and PT tsTON and recieved from protocol tsTON.

#### External Information

- `recv_external()`: Handles external messages with signature verification. In protocol recieve extarnal method used to update Index data that coming directly from tsTON pool and contract addresses data. This way protocol handling the specificity of TON architecture and inability to use get methods from other contracts.

### Usage

The contract handles all essential functions for managing yield tokenization, minting, redeeming, and interest management within the FIVA protocol.

## User Smart Contract

The User Smart Contract is written in FunC. This contract manages user-specific information and interactions within the FIVA protocol, handling interest calculation and redeeming tokens.

### Key Features

- **Interest Management**: Functions to calculate and claim user's interest.
- **Tokenization**: Facilitates the division of yield-bearing assets into Principal Tokens (PT) and Yield Tokens (YT).
- **Redeeming**: Handles the redeeming of tokens and the transfer of underlying assets.

### Storage Structure

- **Owner Address**: The address of the user who owns the contract.
- **Master Contract Address**: The address of the master contract associated with this user contract.
- **Maturity**: The maturity date of the yield-bearing asset.
- **Index**: The current index value for yield calculation.
- **Interest**: The accrued interest for the user.
- **YT Balance**: The balance of Yield Tokens.
- **Burn Data**: Meta information related to burning tokens.

### Functions

#### Interest Management

- `send_cacl_interest()`: Sends the calculated interest details to the master contract and updates the user contract with the new interest value.

#### Redeem

- `fwd_op == "redeem"c`: Burns YT/PT tokens recieved from a user and sends the transfer request for yield-bearing asset in return. For example, the user sent YT tsTON and PT tsTON, contract burns these tokens and send transfer request to the master contract.
- `validate_wallet_addr()`: Validates the address of sender for the given token. This function will be improved in the future to make protocol more secure and avoid melitious actors.
- `burn_token()`: Burns the specified amount of tokens.
- `send_jettons()`: Sends transfer request to the master contract.

### Usage

The contract handles all essential functions for managing user-specific information, yield tokenization, interest calculation, sent token validation, and redeeming tokens within the FIVA protocol. This ensures accurate yield calculations and token management for each user participating in the FIVA protocol.

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts and scripts for deploying and interecting with AMMs using Dedust SDK.



