import * as tf from '@tensorflow/tfjs';

export default class ReplayBuffer {
  actionMemory: tf.Tensor1D; // memorySize x nActions
  memoryCounter = 0;
  memorySize: number;
  newStateMemory: tf.Tensor2D;  // memorySize x ...inputShape
  rewardMemory: tf.Tensor1D;   // memorySize x nActions
  stateMemory: tf.Tensor2D;  // memorySize x ...inputShape
  terminalMemory: tf.Tensor1D; // memorySize

  constructor({
    maxSize,
    inputLength,
  }: {
    maxSize: number;
    inputLength: number;
  }) {
    this.memorySize = maxSize;
    this.stateMemory = tf.tensor([], [this.memorySize, inputLength]);
    this.newStateMemory = tf.tensor([], [this.memorySize, inputLength]);
    this.actionMemory = tf.tensor([], [this.memorySize]);
    this.rewardMemory = tf.tensor([], [this.memorySize]);
    this.terminalMemory = tf.tensor([], [this.memorySize], 'bool')
  }

  storeTransition(state: tf.Tensor, action: tf.Tensor<tf.Rank.R0>, reward: tf.Tensor<tf.Rank.R0>, newState: tf.Tensor, done: tf.Tensor<tf.Rank.R0>): ReplayBuffer {
    const memoryToKeep = Math.min(this.memorySize, this.memoryCounter)
    this.stateMemory = tf.concat2d([state.expandDims<tf.Tensor2D>(1), this.stateMemory.slice([1], [memoryToKeep])], 0);
    this.newStateMemory = tf.concat2d([newState.expandDims<tf.Tensor2D>(1), this.newStateMemory.slice([1], [memoryToKeep])], 0);
    this.actionMemory = tf.concat1d([action.expandDims<tf.Tensor1D>(1), this.actionMemory.slice([1], [memoryToKeep])]);
    this.rewardMemory = tf.concat1d([reward.expandDims<tf.Tensor1D>(1), this.rewardMemory.slice([1], [memoryToKeep])]);
    this.terminalMemory = tf.concat1d([done.expandDims<tf.Tensor1D>(1), this.terminalMemory.slice([1], [memoryToKeep])]);
    this.memoryCounter += 1;
    return this;
  }

  sampleBuffer(batchSize: number): { states: tf.Tensor2D, actions: tf.Tensor1D, rewards: tf.Tensor1D, nextStates: tf.Tensor2D, done: tf.Tensor1D } {
    const maxMemory = Math.min(this.memoryCounter, this.memorySize)
    const indexOptions = [];
    for (let i = 0; i < maxMemory; i += 1) {
      indexOptions.push(i);
    }
    const batchIndices = this._randomChoice(indexOptions, batchSize, false)
    const states: tf.Tensor1D[] = [];
    const nextStates: tf.Tensor1D[] = [];
    const actions: tf.Tensor<tf.Rank.R0>[] = [];
    const rewards: tf.Tensor<tf.Rank.R0>[] = [];
    const done: tf.Tensor<tf.Rank.R0>[] = [];
    for (const batchIndex of batchIndices) {
      states.push(this.stateMemory.slice(batchIndex).squeeze<tf.Tensor1D>());
      nextStates.push(this.newStateMemory.slice(batchIndex).squeeze<tf.Tensor1D>());
      actions.push(this.actionMemory.slice(batchIndex).squeeze<tf.Tensor<tf.Rank.R0>>());
      rewards.push(this.rewardMemory.slice(batchIndex).squeeze<tf.Tensor<tf.Rank.R0>>());
      done.push(this.terminalMemory.slice(batchIndex).squeeze<tf.Tensor<tf.Rank.R0>>());
    }
    return {
      states: tf.stack(states) as tf.Tensor2D,
      actions: tf.stack(actions) as tf.Tensor1D,
      rewards:  tf.stack(rewards) as tf.Tensor1D,
      nextStates: tf.stack(nextStates) as tf.Tensor2D,
      done: tf.stack(done) as tf.Tensor1D,
    };
  }

  _randomChoice<T>(choices: T[], count: number, withReplacement = true): T[] {
    if (withReplacement === false && choices.length < count) {
      throw new Error(`Cannot sample ${count} items from ${choices.length} options without replacement`);
    }
    const remainingChoices = [...choices];
    const selectedItems = [];
    for (let i = 0; i < count; i += 1) {
      const selectedIndex = Math.floor(Math.random() * remainingChoices.length);
      const selectedItem = remainingChoices.splice(selectedIndex, 1)[0];
      selectedItems.push(selectedItem);
    }
    return selectedItems;
  }
}
