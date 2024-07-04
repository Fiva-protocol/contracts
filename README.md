# FIVA contracts

This repo contains two main contracts which are the corstone of FIVA protocol. These protocols are Master and User smarts contracts. 

## FIVA Master Contract

This repository contains the master contract for the FIVA protocol, written in FunC. The contract includes functions and methods to yield tokenization, minting of Principal Tokens (PT) and Yield Tokens (YT) and redeeming them from protocol. Each assets will have separate Master Contract for decided maturity, since for yield stripping defined timeline is needed. 

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




## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts and scripts for deploying and interecting with AMMs using Dedust SDK.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`


