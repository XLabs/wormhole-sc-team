package bsv

import (
	"errors"
	"fmt"

	"github.com/libsv/go-bt/v2"
	"github.com/libsv/go-bt/v2/bscript"
)

// Based on https://github.com/BitcoinSchema/go-bitcoin/blob/master/transaction.go

var (
	ErrInsufficientFunds = errors.New("Insufficient funds for BSV transaction")
)

// Utxo is an unspent transaction output
type Utxo struct {
	Satoshis     uint64 `json:"satoshis"`
	ScriptPubKey string `json:"string"`
	TxID         string `json:"tx_id"`
	Vout         uint32 `json:"vout"`
}

// PayToAddress is the pay-to-address
type PayToAddress struct {
	Address  string `json:"address"`
	Satoshis uint64 `json:"satoshis"`
}

// OpReturnData is the op return data to include in the tx
type OpReturnData [][]byte

// createTx will create a basic transaction and return the raw transaction (*transaction.Transaction)
//
// This will NOT create a change output (funds are sent to "addresses")
// This will NOT handle fee calculation (it's assumed you have already calculated the fee)
//
// Get the raw hex version: tx.ToString()
// Get the tx id: tx.GetTxID()
func createTx(utxos []*Utxo, addresses []*PayToAddress, opReturns []OpReturnData) (*bt.Tx, error) {
	// Start creating a new transaction
	tx := bt.NewTx()

	// Accumulate the total satoshis from all utxo(s)
	var totalSatoshis uint64

	// Loop all utxos and add to the transaction
	var err error
	for _, utxo := range utxos {
		if err = tx.From(utxo.TxID, utxo.Vout, utxo.ScriptPubKey, utxo.Satoshis); err != nil {
			return nil, err
		}
		totalSatoshis += utxo.Satoshis
	}

	// Loop any pay addresses
	for _, address := range addresses {
		var a *bscript.Script
		a, err = bscript.NewP2PKHFromAddress(address.Address)
		if err != nil {
			return nil, err
		}

		if err = tx.PayTo(a, address.Satoshis); err != nil {
			return nil, err
		}
	}

	// Loop any op returns
	for _, op := range opReturns {
		if err = tx.AddOpReturnPartsOutput(op); err != nil {
			return nil, err
		}
	}

	// If inputs are supplied, make sure they are sufficient for this transaction
	if len(tx.Inputs) > 0 {
		// Sanity check - not enough satoshis in utxo(s) to cover all paid amount(s)
		// They should never be equal, since the fee is the spread between the two amounts
		totalOutputSatoshis := tx.TotalOutputSatoshis() // Does not work properly
		if totalOutputSatoshis > totalSatoshis {
			return nil, fmt.Errorf("%w: need %d + (fee), found %d", ErrInsufficientFunds, totalOutputSatoshis, totalSatoshis)
		}
	}

	// Return the transaction as a raw string
	return tx, nil
}
