import * as tf from '@tensorflow/tfjs-node';

import Box from "./Box";

export default interface Environment {
  getActionSpace(): Box;
  getObservationSpace(): Box;
  getRewardRange(): number[];
  reset(): any; // Observation
  step(action: tf.Tensor): { observation: any, reward: tf.Tensor<tf.Rank.R0>, done: tf.Tensor<tf.Rank.R0> };
}
