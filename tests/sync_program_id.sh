 #! /bin/sh
rm ./target/deploy/labofi_solana_smart_contract-keypair.json
anchor keys list
anchor keys sync
anchor build