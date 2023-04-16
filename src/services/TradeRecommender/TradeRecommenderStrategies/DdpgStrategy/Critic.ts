import path from 'path';
import * as tf from '@tensorflow/tfjs';

export default class Critic {
  checkpointDir: string;
  checkpointFile: string;
  fc1: tf.SymbolicTensor | tf.SymbolicTensor[] | tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[];
  fc1Dims: number;
  fc2: tf.SymbolicTensor | tf.SymbolicTensor[] | tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[];
  fc2Dims: number;
  name: string;
  q: tf.SymbolicTensor | tf.SymbolicTensor[] | tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[];
  model: tf.LayersModel;
  stateLength: number;
  nActions: number;
  constructor(
    {
      fc1Dims = 8,
      fc2Dims = 8,
      name = 'critic',
      checkpointDir = '/tmp',
      stateLength,
      nActions,
    }: {
      fc1Dims?: number;
      fc2Dims?: number;
      name?: string;
      checkpointDir?: string;
      stateLength: number;
      nActions: number;
    }
  ) {
    this.stateLength = stateLength;
    this.nActions = nActions;
    this.fc1Dims = fc1Dims;
    this.fc2Dims = fc1Dims;
    this.name = name;
    this.checkpointDir = checkpointDir;

    this.checkpointFile = path.join(this.checkpointDir, `${this.name}_ddpg.h5`);

    const inputs = tf.input({ shape: [this.stateLength + this.nActions] });
    this.fc1 = tf.layers.dense({
      activation: 'relu',
      units: fc1Dims,
    }).apply(inputs);
    this.fc2 = tf.layers.dense({
      activation: 'relu',
      units: fc2Dims
    }).apply(this.fc1);
    this.q = tf.layers.dense({ units: 1 }).apply(this.fc2);
    this.model = new tf.LayersModel({
      inputs,
      outputs: this.q as tf.SymbolicTensor,
    });
  }

  compile(optimizer: tf.Optimizer) {
    this.model.compile({
      optimizer,
      loss: 'MSE'
    });
    return this;
  }
}
