import path from 'path';
import * as tf from '@tensorflow/tfjs-node';

export default class Actor /* extends tf.LayersModel */ {

  checkpointDir: string;
  checkpointFile: string;
  fc1Dims: number;
  fc2Dims: number;
  nActions: number;
  name: string;
  model: tf.LayersModel;
  constructor(
    {
      checkpointDir = '/tmp',
      fc1Dims = 8,
      fc2Dims = 8,
      nActions = 1,
      name = 'actor',
      optimizer,
      stateShape,
    }: {
      checkpointDir?: string;
      fc1Dims?: number;
      fc2Dims?: number;
      nActions?: number;
      name?: string;
      optimizer: tf.Optimizer,
      stateShape: number[],
    }
  ) {
    this.checkpointDir = checkpointDir;
    this.fc1Dims = fc1Dims;
    this.fc2Dims = fc2Dims;
    this.nActions = nActions;
    this.name = name;
    this.checkpointFile = path.join(this.checkpointDir, `${this.name}_ddpg.h5`);

    const inputs = tf.input({ shape: stateShape })
    const fc1 = tf.layers.dense({
      activation: 'relu',
      units: this.fc1Dims,
    }).apply(inputs);
    const fc2 = tf.layers.dense({
      activation: 'relu',
      units: this.fc2Dims
    }).apply(fc1);
    const mu = tf.layers.dense({
      activation: 'tanh',
      units: this.nActions
    }).apply(fc2);
    this.model = new tf.LayersModel({
      inputs,
      outputs: mu as tf.SymbolicTensor,
    });
    this.model.compile({
      optimizer,
      loss: 'MSE'
    });
  }

  getWeights(): tf.Tensor<tf.Rank>[] {
    return this.model.getWeights();
  }

  predict(state: tf.Tensor): tf.Tensor {
    return this.model.predict(state) as tf.Tensor;
  }

  setWeights(weights: tf.Tensor<tf.Rank>[]): Actor {
    this.model.setWeights(weights);
    return this;
  }
}
