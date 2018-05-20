/*
 * The MIT License (MIT)
 * Copyright (c) 2018 xMobe https://www.xmobe.com
 * Author: Arkay Lee <quanganh@aiti.com.vn>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { ec, secp256k1 } from 'elliptic';
import { Transaction } from './Transaction';
import { TxIn } from './TransactionIn';
import { TxOut } from './TransactionOut';

const COINBASE_AMOUNT: number = 50;

export class TxPool {
    private EC: secp256k1;

    constructor() {
        this.EC = new ec('secp256k1');
    }

    getCoinbaseTransaction(address: string, blockIndex: number): Transaction {
        let t = new Transaction();
        let txIn: TxIn = new TxIn();
        txIn.signature = '';
        txIn.txId = '';
        txIn.txOutIndex = blockIndex;

        t.txIns.push(txIn);
        t.txOuts.push(new TxOut(address, COINBASE_AMOUNT));
        const txId = t.getTransactionId();
        return t;
    }

    isValidAddress(address: string): boolean {
        if (address.length !== 130) {
            console.log(`Address ${address} have invalid public key length`);
            return false;
        } else if (address.match('^[a-fA-F0-9]+$') === null) {
            console.log(`Pulibc key must contain only hex character`);
            return false;
        } else if (!address.startsWith('04')) {
            console.log(`Address must start with 04`);
            return false;
        }

        return true;
    }
}