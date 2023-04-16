import path from 'path';
import * as tf from '@tensorflow/tfjs';

export default class Actor /* extends tf.LayersModel */ {

  checkpointDir: string;
  checkpointFile: string;
  fc1: tf.SymbolicTensor | tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[] | tf.SymbolicTensor[];
  fc1Dims: number;
  fc2: tf.SymbolicTensor | tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[] | tf.SymbolicTensor[];
  fc2Dims: number;
  mu: tf.SymbolicTensor | tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[] | tf.SymbolicTensor[];
  nActions: number;
  name: string;
  model: tf.LayersModel;
  stateLength: number;
  constructor(
    {
      checkpointDir = '/tmp',
      fc1Dims = 8,
      fc2Dims = 8,
      nActions = 1,
      name = 'actor',
      stateLength,
    }: {
      checkpointDir?: string;
      fc1Dims?: number;
      fc2Dims?: number;
      nActions?: number;
      name?: string;
      stateLength: number;
    }
  ) {
    this.checkpointDir = checkpointDir;
    this.fc1Dims = fc1Dims;
    this.fc2Dims = fc2Dims;
    this.nActions = nActions;
    this.name = name;
    this.stateLength = stateLength;

    this.checkpointFile = path.join(this.checkpointDir, `${this.name}_ddpg.h5`);

    const inputs = tf.input({ shape: [this.stateLength] })
    this.fc1 = tf.layers.dense({
      activation: 'relu',
      units: fc1Dims,
    }).apply(inputs);
    this.fc2 = tf.layers.dense({
      activation: 'relu',
      units: fc2Dims
    }).apply(this.fc1);
    this.mu = tf.layers.dense({
      activation: 'tanh',
      units: nActions
    }).apply(this.fc2);
    this.model = new tf.LayersModel({
      inputs,
      outputs: this.mu as tf.SymbolicTensor,
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
