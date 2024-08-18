import { LiteClient } from "ton-lite-client";
import { liteServer_masterchainInfo } from "ton-lite-client/dist/schema"
import Queue from 'queue'
import { EventEmitter } from "events";

const getBlockKey = (blockId: liteServer_masterchainInfo) =>
  `(${blockId.last.workchain},${blockId.last.shard})`;

export class BlockTracker extends EventEmitter {
  private readonly shardsCursors = new Map<string, number>();
  private importTransactionsQueue = new Queue({ concurrency: 1, autostart: true });
  private interval: NodeJS.Timeout | undefined
  private started = false

  constructor(private readonly client: LiteClient) {
    super();
  }

  start() {
    this.started = true;
    this.#tick();
    this.interval = setInterval(() => this.#tick(), 1_000);
  }

  stop() {
    if (!this.started) {
      return;
    }

    clearInterval(this.interval);
    this.interval = undefined;
    this.importTransactionsQueue.end();
  }

  async importBlockTransactions(masterBlock: liteServer_masterchainInfo, workchain: number, shard: bigint, seqno: number) {
    const block = await this.client.lookupBlockByID({
      workchain,
      shard: shard.toString(),
      seqno,
    })

    await this.importTransactionsQueue.push(
      async () => {
        const blockTransactions = await this.client.listBlockTransactions(block.id);
        this.emit('transactions', {
          masterBlock,
          transactions: blockTransactions,
          workchain,
        })
      }
    );
  }

  async importMasterchainBlock(masterBlock: liteServer_masterchainInfo) {
    const masterBlockKey = getBlockKey(masterBlock);

    await this.importBlockTransactions(masterBlock, masterBlock.last.workchain, BigInt(masterBlock.last.shard), masterBlock.last.seqno);

    const shardsInfo = await this.client.getAllShardsInfo(masterBlock.last);

    const { shards } = shardsInfo;

    for (const [workchain, shardValue] of Object.entries(shards)) {
      for (const [shard, shardSeqno] of Object.entries(shardValue)) {
        const shardBlockKey = `(${workchain},${shard})`;
        const previousSeqno = this.shardsCursors.get(shardBlockKey);

        if (previousSeqno) {
          for (let seqno = previousSeqno + 1; seqno <= shardSeqno; seqno++) {
            await this.importBlockTransactions(masterBlock, Number(workchain), BigInt(shard), seqno);
          }
        } else {
          await this.importBlockTransactions(masterBlock, Number(workchain), BigInt(shard), shardSeqno);
        }

        this.shardsCursors.set(shardBlockKey, shardSeqno);
      }
    }

    this.shardsCursors.set(masterBlockKey, masterBlock.last.seqno);
    const currentShardKeys = Object.entries(shards).flatMap(([workchain, shardValue]) =>
      Object.entries(shardValue).map(([shard]) => `(${workchain},${shard})`)
    );

    this.shardsCursors.forEach((_, blockKey) => {
      if (!currentShardKeys.includes(blockKey) && blockKey !== masterBlockKey) {
        this.shardsCursors.delete(blockKey);
      }
    });
  }

  async #tick() {
    const masterBlock = await this.client.getMasterchainInfo();
    const masterBlockKey = getBlockKey(masterBlock);

    const previousSeqno = this.shardsCursors.get(masterBlockKey);

    if (masterBlock.last.seqno !== previousSeqno) {
      await this.importMasterchainBlock(masterBlock);
    }
  }
}