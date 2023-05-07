import * as tf from '@tensorflow/tfjs-node';

export default class ReplayBuffer {
  actionMemory: tf.Tensor; // memorySize x ...actionShape
  memoryCounter = 0;
  memorySize: number;
  nextObservationMemory: tf.Tensor;  // memorySize x ...observationShape
  rewardMemory: tf.Tensor1D;  // memorySize
  observationMemory: tf.Tensor;  // memorySize x ...observationShape
  terminalMemory: tf.Tensor1D; // memorySize

  constructor({
    actionShape,
    maxSize,
    observationShape,
  }: {
    actionShape: number[];
    maxSize: number;
    observationShape: number[];
  }) {
    this.memorySize = maxSize;
    // this.observationMemory = tf.tensor([], [this.memorySize, ...observationShape]);
    this.observationMemory = tf.tensor([], [this.memoryCounter, ...observationShape]);
    // this.nextObservationMemory = tf.tensor([], [this.memorySize, ...observationShape]);
    this.nextObservationMemory = tf.tensor([], [this.memoryCounter, ...observationShape]);
    this.actionMemory = tf.tensor([], [this.memoryCounter, ...actionShape]);
    this.rewardMemory = tf.tensor1d([]);
    this.terminalMemory = tf.tensor1d([], 'bool')
  }

  storeTransition(observation: tf.Tensor, action: tf.Tensor, reward: tf.Tensor<tf.Rank.R0>, nextObservation: tf.Tensor, done: tf.Tensor<tf.Rank.R0>): ReplayBuffer {

    if (this.memoryCounter < this.memorySize) {
      this.observationMemory = tf.concat([observation.expandDims(), this.observationMemory], 0);
      this.nextObservationMemory = tf.concat([nextObservation.expandDims(), this.nextObservationMemory], 0);
      this.actionMemory = tf.concat([action.expandDims(), this.actionMemory], 0);
      this.rewardMemory = tf.concat1d([reward.expandDims<tf.Tensor1D>(), this.rewardMemory]);
      this.terminalMemory = tf.concat1d([done.expandDims<tf.Tensor1D>(), this.terminalMemory]);
    } else {
      const memoryToKeep = Math.min(this.memorySize, this.memoryCounter)
      this.observationMemory = tf.concat([observation.expandDims(), this.observationMemory.slice([1], [memoryToKeep - 1])], 0);
      this.nextObservationMemory = tf.concat([nextObservation.expandDims(), this.nextObservationMemory.slice([1], [memoryToKeep - 1])], 0);
      this.actionMemory = tf.concat([action.expandDims(), this.actionMemory.slice([1], [memoryToKeep - 1])], 0);
      this.rewardMemory = tf.concat1d([reward.expandDims<tf.Tensor1D>(), this.rewardMemory.slice([1], [memoryToKeep - 1])]);
      this.terminalMemory = tf.concat1d([done.expandDims<tf.Tensor1D>(), this.terminalMemory.slice([1], [memoryToKeep - 1])]);
    }
    this.memoryCounter += 1;
    return this;
  }

  sampleBuffer(batchSize: number): { observations: tf.Tensor, actions: tf.Tensor, rewards: tf.Tensor1D, nextObservations: tf.Tensor, done: tf.Tensor1D } {
    const maxMemory = Math.min(this.memoryCounter, this.memorySize)
    const indexOptions = [];
    for (let i = 0; i < maxMemory; i += 1) {
      indexOptions.push(i);
    }
    const batchIndices = this._randomChoice(indexOptions, batchSize, false)
    const observations: tf.Tensor[] = [];
    const nextObservations: tf.Tensor[] = [];
    const actions: tf.Tensor[] = [];
    const rewards: tf.Tensor1D[] = [];
    const done: tf.Tensor1D[] = [];

    for (const batchIndex of batchIndices) {
      observations.push(this.observationMemory.slice([batchIndex], [1]).squeeze([0]));
      nextObservations.push(this.nextObservationMemory.slice([batchIndex], [1]).squeeze([0]));
      actions.push(this.actionMemory.slice([batchIndex], [1]).squeeze([0]));
      rewards.push(this.rewardMemory.slice([batchIndex], [1]).squeeze<tf.Tensor1D>([0]));
      done.push(this.terminalMemory.slice([batchIndex], [1]).squeeze<tf.Tensor1D>([0]));
    }

    return {
      observations: tf.stack(observations),
      actions: tf.stack(actions),
      rewards:  tf.stack(rewards) as tf.Tensor1D,
      nextObservations: tf.stack(nextObservations),
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
