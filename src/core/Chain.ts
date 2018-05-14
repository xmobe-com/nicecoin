/**
 * Copyright 2018 xMobe
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Crypto from 'crypto';
import { Block } from './block';
import { byte2BinaryString, getCurrentTimestamp } from './Utils';

// in seconds 
const BLOCK_GENERATION_INTERVAL: number = 10 * 1000;
// in blocks 
const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;
const TIME_EXPECTED: number = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
const MINUTES: number = 60 * 1000;

/**
 * Chain
 */
export class Chain {
    static instance: Chain = null;
    public blocks: Block[];
    private currentBlock: Block = null;
    /**
     * Creates an instance of chain.
     * @constructor
     */
    private constructor() {
        this.blocks = new Array<Block>();
    }

    static async getInstance(): Promise<Chain> {
        if (!Chain.instance) {
            Chain.instance = new Chain();
            await Chain.instance.createGenesisBlock();
        }
        return Chain.instance;
    }

    private async createGenesisBlock() {
        // explicit set a date 
        let now = new Date();
        now.setDate(20);
        now.setMonth(5);
        now.setFullYear(2017);
        now.setHours(10);
        now.setMinutes(9);
        now.setSeconds(0);

        let genesisBlock = new Block(0, (now.getTime()), null, 'NiceCoin Genesis Block', 5, 0);
        let hash = await genesisBlock.getHashAsString();

        console.log('Anything Human can understand!!!');
        console.log('Genesis hash: ', hash);
        // console.log('Genesis ', genesisBlock);

        this.blocks.push(genesisBlock);
        this.currentBlock = genesisBlock;
    }

    public getCurrentBlock() {
        return this.currentBlock;
    }

    public getLatestBlock() {
        return this.blocks[this.blocks.length - 1];
    }

    public async mine(blockData: any): Promise<Block> {
        console.time('Mine Block ' + blockData + ' in');
        const prevBlock: Block = this.getLatestBlock();
        const difficulty: number = this.getDifficulty();
        const nextIndex: number = prevBlock.index + 1;
        const timestamp: number = getCurrentTimestamp();
        const prevHash = await prevBlock.getHash();
        const newBlock: Block = await this.PoW(nextIndex, timestamp, prevHash, blockData, difficulty)

        let isAdded = await this.addBlockToChain(newBlock);
        if (isAdded) {
            console.log(newBlock.index, newBlock.timestamp, newBlock.difficult);
        }
        console.timeEnd('Mine Block ' + blockData + ' in');
        return newBlock;
    }

    private async addBlockToChain(block: Block): Promise<boolean> {
        let valid = await this.isValidNewBlock(block, this.getLatestBlock());

        if (valid) {
            this.blocks.push(block);
            return true;
        } else {
            return false;
        }
    }

    private async isValidBlockStructure(block: Block): Promise<boolean> {
        let hash = await block.getHash();
        return typeof block.index === 'number'
            && typeof block.timestamp === 'number'
            && block.previousHash instanceof Buffer
            && hash instanceof Buffer
            && (typeof block.data === 'object' || typeof block.data === 'string')
    }

    private async isValidNewBlock(block: Block, prevBlock: Block): Promise<boolean> {
        let validBlockStructure = await this.isValidBlockStructure(block);

        if (!validBlockStructure) {
            return false;
        }

        if ((prevBlock.index + 1) !== block.index) {
            return false;
        } else if (!this.isValidTimestamp(block, prevBlock)) {
            return false;
        }

        let prevBlockHash: Buffer = await prevBlock.getHash();

        if (Buffer.compare(prevBlockHash, block.previousHash) !== 0) {
            return false;
        }

        return true;
    }

    /**
     * The Proof-of-work puzzle is to find a block hash, that has a specific number of zeros prefixing it. 
     * The difficulty property defines how many prefixing zeros the block hash must have , in order for the block to be valid.
     * 
     * @param hash 
     * @param difficult 
     */
    public async hashMatchesDifficulty(hash: Buffer, difficult: number): Promise<boolean> {
        // TODO: Need improve, working with Binary data
        let hashString: string = '';

        for (let i = 0; i < hash.length; i++) {
            hashString += byte2BinaryString(hash[i]) + ' ';
        }

        const requiredPrefix: string = '0'.repeat(difficult);

        // if (hashString.startsWith(requiredPrefix)) {
        // console.log(Buffer.from(hash).toString('hex'));
        console.log(hashString);
        // }

        return hashString.startsWith(requiredPrefix);
    }

    /**
     * In order to find a hash that satisfies the difficulty, we must be able to calculate different hashes 
     * for the same content of the block. This is done by modifying the nonce parameter. 
     * Because SHA256 is a hash function, each time anything in the block changes, the hash will be completely different. 
     * 
     * “Mining” is basically just trying a different nonce until the block hash matches the difficulty.
     * 
     * @param index 
     * @param timestamp 
     * @param previousHash 
     * @param data 
     * @param difficulty 
     */
    public async PoW(index: number, timestamp: number, previousHash: Buffer, data: any, difficulty: number): Promise<Block> {
        let nonce = 0;
        while (true) {
            let block = new Block(index, timestamp, previousHash, data, difficulty, nonce)
            const hash: Buffer = await block.getHash();
            let isMatchDifficulty = await this.hashMatchesDifficulty(hash, difficulty);
            if (isMatchDifficulty) {
                return block;
            }

            nonce++;
        }
    }

    /**
     * Gets adjusted difficulty
     * The expected time represents the case where the hashrate matches exactly the current difficulty. 
     * We either increase or decrease the difficulty by one if the time taken is at least two times greater or smaller than the expected difficulty.
     * @param latestBlock 
     * @returns 
     */
    public getAdjustedDifficulty(latestBlock: Block) {
        const preAdjustmentBlock = this.blocks[this.blocks.length - DIFFICULTY_ADJUSTMENT_INTERVAL];

        const timeTaken: number = latestBlock.timestamp - preAdjustmentBlock.timestamp;

        if (timeTaken < TIME_EXPECTED / 2) {
            return preAdjustmentBlock.difficult + 1;
        } else if (timeTaken > TIME_EXPECTED * 2) {
            return preAdjustmentBlock.difficult - 1;
        } else {
            return preAdjustmentBlock.difficult;
        }
    }

    /**
     * Gets difficulty
     * For every 10 blocks that is generated, we check if the time that took to generate those blocks are larger or smaller than the expected time.
     * @returns difficulty 
     */
    public getDifficulty(): number {
        const latestBlock = this.blocks[this.blocks.length - 1];

        if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
            return this.getAdjustedDifficulty(latestBlock);
        } else {
            return latestBlock.difficult;
        }
    }

    /**
     * Determines whether valid timestamp is
     * - A block is valid, if the timestamp is at most 1 min in the future from the time we perceive. 
     * - A block in the chain is valid, if the timestamp is at most 1 min in the past of the previous block.
     * @param block 
     * @param prevBlock 
     * @returns true if valid timestamp 
     */
    public isValidTimestamp(block: Block, prevBlock: Block): boolean {

        return ((prevBlock.timestamp - MINUTES) < block.timestamp) && ((block.timestamp - MINUTES) < getCurrentTimestamp());
    }
}