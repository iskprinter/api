import path from 'path';
import * as tf from '@tensorflow/tfjs-node';

export default class Critic {
  checkpointDir: string;
  checkpointFile: string;
  fc1Dims: number;
  fc2Dims: number;
  name: string;
  model: tf.LayersModel;
  nActions: number;
  constructor(
    {
      fc1Dims = 8,
      fc2Dims = 8,
      name = 'critic',
      checkpointDir = '/tmp',
      nActions,
      optimizer,
      stateShape,
    }: {
      fc1Dims?: number;
      fc2Dims?: number;
      name?: string;
      checkpointDir?: string;
      nActions: number;
      optimizer: tf.Optimizer;
      stateShape: number[];
    }
  ) {
    this.nActions = nActions;
    this.fc1Dims = fc1Dims;
    this.fc2Dims = fc2Dims;
    this.name = name;
    this.checkpointDir = checkpointDir;
    this.checkpointFile = path.join(this.checkpointDir, `${this.name}_ddpg.h5`);

    const inputs = tf.input({ shape: [stateShape[0] + this.nActions, ...stateShape.slice(1)] });
    const fc1 = tf.layers.dense({
      activation: 'relu',
      units: this.fc1Dims,
    }).apply(inputs);
    const fc2 = tf.layers.dense({
      activation: 'relu',
      units: this.fc2Dims
    }).apply(fc1);
    const q = tf.layers.dense({ units: 1 }).apply(fc2);
    this.model = new tf.LayersModel({
      inputs,
      outputs: q as tf.SymbolicTensor,
    });
    this.model.compile({
      optimizer,
      loss: 'MSE'
    });
  }

  getWeights(): tf.Tensor<tf.Rank>[] {
    return this.model.getWeights();
  }

  predict(state: tf.Tensor, action: tf.Tensor<tf.Rank.R0>): tf.Tensor {
    if (!this.model) {
      throw new Error('You must compile a model before using it for prediction.');
    }
    return this.model.predict(tf.concat([state, action], 1)) as tf.Tensor;
  }

  setWeights(weights: tf.Tensor<tf.Rank>[]): Critic {
    this.model.setWeights(weights);
    return this;
  }
}
