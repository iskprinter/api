// import * as tf from '@tensorflow/tfjs-node';

// export default class Actor /* extends tf.LayersModel */ {

//   actionShape: number[];
//   checkpointFile: string;
//   fc1Dims: number;
//   fc2Dims: number;
//   model: tf.LayersModel;
//   name: string;
//   constructor(
//     {
//       actionShape = [1],
//       checkpointDir = '/tmp',
//       fc1Dims = 8,
//       fc2Dims = 8,
//       name = 'actor',
//       optimizer,
//       observationShape,
//     }: {
//       actionShape?: number[];
//       checkpointDir?: string;
//       fc1Dims?: number;
//       fc2Dims?: number;
//       name?: string;
//       optimizer: tf.Optimizer,
//       observationShape: number[],
//     }
//   ) {
//     this.actionShape = actionShape;
//     this.fc1Dims = fc1Dims;
//     this.fc2Dims = fc2Dims;
//     this.name = name;
//     this.checkpointFile = `file://${checkpointDir}/${this.name}_ddpg.h5`;

//     const inputs = tf.input({ shape: observationShape });
//     const fc1 = tf.layers.dense({
//       activation: 'relu',
//       units: this.fc1Dims,
//     }).apply(inputs);
//     const fc2 = tf.layers.dense({
//       activation: 'relu',
//       units: this.fc2Dims,
//     }).apply(fc1);
//     const mu = tf.layers.dense({
//       activation: 'tanh',
//       units: this.actionShape[0], // TODO: Generalize this by all dimensions
//     }).apply(fc2);
//     this.model = new tf.LayersModel({
//       inputs,
//       outputs: mu as tf.SymbolicTensor,
//     });
//     this.model.compile({
//       optimizer,
//       loss: 'meanSquaredError'
//     });
//   }

//   getWeights(): tf.Tensor<tf.Rank>[] {
//     return this.model.getWeights();
//   }

//   async load(): Promise<Actor> {
//     this.model = await tf.loadLayersModel(this.checkpointFile);
//     return this;
//   }

//   predict(observation: tf.Tensor): tf.Tensor {
//     return this.model.predict(observation) as tf.Tensor;
//   }

//   async save(): Promise<Actor> {
//     await this.model.save(this.checkpointFile);
//     return this;
//   }

//   setWeights(weights: tf.Tensor<tf.Rank>[]): Actor {
//     this.model.setWeights(weights);
//     return this;
//   }
// }
