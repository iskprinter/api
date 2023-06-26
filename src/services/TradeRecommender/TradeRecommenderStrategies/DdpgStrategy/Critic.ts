// import * as tf from '@tensorflow/tfjs-node';

// export default class Critic {
//   checkpointFile: string;
//   fc1Dims: number;
//   fc2Dims: number;
//   model: tf.LayersModel;
//   name: string;
//   constructor(
//     {
//       actionShape,
//       checkpointDir = '/tmp',
//       fc1Dims = 8,
//       fc2Dims = 8,
//       name = 'critic',
//       optimizer,
//       observationShape,
//     }: {
//       actionShape: number[];
//       checkpointDir?: string;
//       fc1Dims?: number;
//       fc2Dims?: number;
//       name?: string;
//       optimizer: tf.Optimizer;
//       observationShape: number[];
//     }
//   ) {
//     this.fc1Dims = fc1Dims;
//     this.fc2Dims = fc2Dims;
//     this.name = name;
//     this.checkpointFile = `file://${checkpointDir}/${this.name}_ddpg.h5`;

//     const inputs = tf.input({ shape: [observationShape[0] + actionShape[0]] }); // Hacky. Generalize this.
//     const fc1 = tf.layers.dense({
//       activation: 'relu',
//       units: this.fc1Dims,
//     }).apply(inputs);
//     const fc2 = tf.layers.dense({
//       activation: 'relu',
//       units: this.fc2Dims
//     }).apply(fc1);
//     const q = tf.layers.dense({ units: 1 }).apply(fc2);
//     this.model = new tf.LayersModel({
//       inputs,
//       outputs: q as tf.SymbolicTensor,
//     });
//     this.model.compile({
//       optimizer,
//       loss: 'meanSquaredError'
//     });
//   }

//   getWeights(): tf.Tensor<tf.Rank>[] {
//     return this.model.getWeights();
//   }

//   async load(): Promise<Critic> {
//     this.model = await tf.loadLayersModel(this.checkpointFile);
//     return this;
//   }

//   predict(observation: tf.Tensor, action: tf.Tensor<tf.Rank.R0>): tf.Tensor {
//     if (!this.model) {
//       throw new Error('You must compile a model before using it for prediction.');
//     }
//     return this.model.predict(tf.concat([observation, action], 1)) as tf.Tensor;
//   }

//   async save(): Promise<Critic> {
//     await this.model.save(this.checkpointFile);
//     return this;
//   }

//   setWeights(weights: tf.Tensor<tf.Rank>[]): Critic {
//     this.model.setWeights(weights);
//     return this;
//   }
// }
