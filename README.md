<h1>Wrapped Hive Engine Tokens</h1>

Copyright: @fbslo, 2020

---

This repo includes source code for ***backend*** of Wrapped Hive Engine (wHE) token oracle.

---

How does it work?

***Deposits***: conversion from native HE tokens to ERC20 tokens on Ethereum

User transfers tokens to @deposit-account with ethereum address as memo. On Ethereum, tokens are minted (or transfered) to that address.

***Withdrawals***: conversion from ERC20 tokens on Ethereum to Hive Engine tokens on Hive

User calls function in tokens smart contract. Both functions accept `amount`, `username` (in this order). It will emit `convertToken` event that is detected by oracle app.

function: `convertTokenWithBurn` or `convertTokenWithTransfer`

If you use mintable tokens, you should use `convertTokenWithBurn`, if you have fixed supply token, use `convertTokenWithTransfer` (it will transfer tokens back to hardcoded address)

For more info about contract, visit https://github.com/fbslo/whe-contract

---

Installation:

For automatic installation, use https://github.com/fbslo/whe-installer

---

Special thanks to @superoo7 and his work on https://github.com/superoo7/BSwap contract.
