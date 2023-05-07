import * as tf from '@tensorflow/tfjs-node';

import Box from './Box';

describe('Box', () => {
  let box: Box;

  beforeEach(() => {
    box = new Box({
      low: tf.tensor2d([[4, 5, 6], [7, 8, 9]]),
      high: tf.tensor2d([[8, 10, 12], [14, 16, 18]]),
      shape: [2, 3],
    });
  });

  it('must have a consistent shape, upper bound length, and lower bound length', () => {
    expect(() => new Box({
      low: tf.tensor1d([4, 5, 6]),
      high: tf.tensor1d([8, 10]),
      shape: [3],
    })).toThrowError(RangeError);
    expect(() => new Box({
      low: tf.tensor2d([[4, 5], [6, 7]]),
      high: tf.tensor2d([[8, 10, 12], [14, 16, 18]]),
      shape: [2, 2],
    })).toThrowError(RangeError);
  });

  it('can sample from a random exponential distribution', () => {
    const samples = box._randomExponential([2, 3]);
    expect(samples.min<tf.Tensor<tf.Rank.R0>>().bufferSync().get(0)).toBeGreaterThan(0);
  });

  it('initializes upper bound correctly when bounded', () => {
    expect(box.boundedAbove.arraySync()).toMatchObject([
      [1, 1, 1],
      [1, 1, 1],
    ]);
  });

  it('initializes upper bound correctly when unbounded', () => {
    const box = new Box({
      low: tf.tensor2d([[4, 5, 6], [7, 8, -Infinity]]),
      high: tf.tensor2d([[8, Infinity, 12], [Infinity, Infinity, 18]]),
      shape: [2, 3],
    });
    expect(box.boundedAbove.arraySync()).toMatchObject([
      [1, 0, 1],
      [0, 0, 1],
    ]);
  });

  it('initializes lower bound correctly when bounded', () => {
    expect(box.boundedBelow.arraySync()).toMatchObject([
      [1, 1, 1],
      [1, 1, 1]
    ]);
  });

  it('initializes lower bound correctly when unbounded', () => {
    const box = new Box({
      low: tf.tensor2d([[4, 5, 6], [7, 8, -Infinity]]),
      high: tf.tensor2d([[8, Infinity, 12], [Infinity, Infinity, 18]]),
      shape: [2, 3],
    });
    expect(box.boundedBelow.arraySync()).toMatchObject([
      [1, 1, 1],
      [1, 1, 0],
    ]);
  });

  it('properly generates samples when lower bounded', () => {
    const samples = box.sample();
    expect(samples.min().bufferSync().get()).toBeGreaterThanOrEqual(4);
  });

  it('properly generates samples when upper bounded', () => {
    const samples = box.sample();
    expect(samples.max().bufferSync().get()).toBeLessThanOrEqual(18);
  });
});
