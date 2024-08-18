# Ton Block Tracker

A simple NPM package for tracking new blocks on the TON blockchain using the TON Lite Client. This library allows you to monitor and capture transactions for the masterchain and shardchain blocks in real-time.

## Features

- Track new masterchain blocks and shardchain blocks.
- Emit events with block transactions as soon as they are available.
- Handle block sequences and replays automatically.
- Queue transaction imports to avoid overlapping operations.

## Installation

To install the package, use npm or yarn:

```bash
npm install ton-block-tracker
yarn add ton-block-tracker
```

## Usage

Here's a basic example demonstrating how to use the `BlockTracker` class to monitor new blocks and their transactions.

```javascript
import { LiteClient } from 'ton-lite-client';
import { BlockTracker } from 'ton-block-tracker';

// Initialize the LiteClient instance
const client = new LiteClient({
  // Add your LiteClient configurations here
});

// Create a BlockTracker instance
const blockTracker = new BlockTracker(client);

// Listen for transaction events
blockTracker.on('transactions', ({ masterBlock, transactions }) => {
  console.log('New transactions detected:', transactions);
});

// Start the block tracker
blockTracker.start();

// To stop the tracker
// blockTracker.stop();
```

## API

### BlockTracker

The main class responsible for tracking and processing new blocks and their transactions.

#### Constructor

```javascript
new BlockTracker(client: LiteClient)
```

**Parameters:**

- `client`: An instance of `LiteClient` for interacting with the TON blockchain.

#### Methods

##### start()

Starts the block tracking process. It begins polling for new blocks every second and processes them sequentially.

##### stop()

Stops the block tracking process and clears any pending operations in the queue.

## Events

The *BlockTracker* class emits events that you can listen to in your application.

### `transactions`

Triggered whenever new transactions are detected for a block.

**Event Data:**

-   `masterBlock`: The master block information.
-   `transactions`: An array containing the transactions in the block.

**Example Usage:**

```typescript
blockTracker.on('transactions', ({ masterBlock, transactions }) => {
  console.log('New transactions detected:', transactions);
});
```

## How it Works

- The `BlockTracker` uses the `LiteClient` to fetch the latest masterchain block.
- It checks if new masterchain blocks are available based on sequence numbers.
- If a new masterchain block is detected, it fetches all shardchain information and imports their transactions.
- All transactions are emitted through an event, allowing users to handle them as needed.

## Contributing

Feel free to open issues or contribute by submitting a pull request if you have any suggestions, bug reports, or improvements.

## License

This project is licensed under the MIT License.
