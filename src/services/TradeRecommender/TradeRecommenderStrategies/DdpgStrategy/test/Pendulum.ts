import * as tf from '@tensorflow/tfjs-node';

import Box from '../Box';
import Environment from '../Environment';

// __credits__ = ["Carlos Luis"]

// from os import path
// from typing import Optional

// import numpy as np

// import gym
// from gym import spaces
// from gym.envs.classic_control import utils
// from gym.error import DependencyNotInstalled

/*
Based on https://github.com/openai/gym/blob/master/gym/envs/classic_control/pendulum.py

### Description

The inverted pendulum swingup problem is based on the classic problem in control theory.
The system consists of a pendulum attached at one end to a fixed point, and the other end being free.
The pendulum starts in a random position and the goal is to apply torque on the free end to swing it
into an upright position, with its center of gravity right above the fixed point.

The diagram below specifies the coordinate system used for the implementation of the pendulum's
dynamic equations.

![Pendulum Coordinate System](./diagrams/pendulum.png)

-  `x-y`: cartesian coordinates of the pendulum's end in meters.
- `theta` : angle in radians.
- `tau`: torque in `N m`. Defined as positive _counter-clockwise_.

### Action Space

The action is a `ndarray` with shape `(1,)` representing the torque applied to free end of the pendulum.

| Num | Action | Min  | Max |
|-----|--------|------|-----|
| 0   | Torque | -2.0 | 2.0 |


### Observation Space

The observation is a `ndarray` with shape `(3,)` representing the x-y coordinates of the pendulum's free
end and its angular velocity.

| Num | Observation      | Min  | Max |
|-----|------------------|------|-----|
| 0   | x = cos(theta)   | -1.0 | 1.0 |
| 1   | y = sin(theta)   | -1.0 | 1.0 |
| 2   | Angular Velocity | -8.0 | 8.0 |

### Rewards

The reward function is defined as:

*r = -(theta<sup>2</sup> + 0.1 * theta_dt<sup>2</sup> + 0.001 * torque<sup>2</sup>)*

where `$\theta$` is the pendulum's angle normalized between *[-pi, pi]* (with 0 being in the upright position).
Based on the above equation, the minimum reward that can be obtained is
*-(pi<sup>2</sup> + 0.1 * 8<sup>2</sup> + 0.001 * 2<sup>2</sup>) = -16.2736044*,
while the maximum reward is zero (pendulum is upright with zero velocity and no torque applied).

### Starting State

The starting state is a random angle in *[-pi, pi]* and a random angular velocity in *[-1,1]*.

### Episode Truncation

The episode truncates at 200 time steps.

### Arguments

- `g`: acceleration of gravity measured in *(m s<sup>-2</sup>)* used to calculate the pendulum dynamics.
The default value is g = 10.0 .

```
gym.make('Pendulum-v1', g=9.81)
```

### Version History

* v1: Simplify the math equations, no difference in behavior.
* v0: Initial versions release (1.0.0)

*/
export default class Pendulum implements Environment {

  actionSpace!: Box;
  clock: unknown;
  dt: number;
  g: number;
  isOpen: boolean;
  l: number;
  m: number;
  maxSpeed: number;
  maxTorque: number;
  metadata = {
    renderModes: ["human", "rgb_array"],
    renderFps: 30,
  }
  observationSpace!: Box;
  renderMode?: string;
  rewardRange!: number[];
  screen: unknown;
  screenDim: number;
  state!: {
    th: tf.Tensor<tf.Rank.R0>;
    thDot: tf.Tensor<tf.Rank.R0>;
  };

  constructor(renderMode?: string, g = 10.0) {
    this.dt = 0.05;
    this.g = g;
    this.isOpen = true;
    this.l = 1.0;
    this.m = 1.0;
    this.maxSpeed = 8;
    this.maxTorque = 2;
    this.renderMode = renderMode;
    this.screenDim = 500;
    this.reset();
  }

  getActionSpace(): Box {
    return this.actionSpace;
  }

  getObservationSpace(): Box {
    return this.observationSpace;
  }

  getRewardRange(): number[] {
    return this.rewardRange;
  }

  reset(): tf.Tensor1D { 
    this.state = {
      th: tf.tensor<tf.Rank.R0>((Math.random() - 0.5) / 0.5 * Math.PI),
      thDot: tf.tensor<tf.Rank.R0>((Math.random() - 0.5) / 0.5 * 1),
    };

    const shape: [number] = [1];
    this.actionSpace = new Box({
      low: tf.fill<tf.Rank.R1>(shape, -this.maxTorque),
      high: tf.fill<tf.Rank.R1>(shape, this.maxTorque),
      shape,
    });

    const high = tf.tensor1d([1.0, 1.0, this.maxSpeed]);
    this.observationSpace = new Box({
      low: high.neg(),
      high,
      shape: high.shape,
    });
    this.rewardRange = [0];

    return this._getObservation();
  }

  step(action: tf.Tensor1D): { observation: tf.Tensor1D, reward: tf.Tensor<tf.Rank.R0>, done: tf.Tensor<tf.Rank.R0> } {
    const { th, thDot } = this.state;
    const g = this.g
    const m = this.m
    const l = this.l
    const dt = this.dt

    const clippedAction = tf.clipByValue(action, -this.maxTorque, this.maxTorque);
    const costs = clippedAction
      .sum<tf.Tensor<tf.Rank.R0>>() // Converts tf.Tensor1D to <tf.Tensor<tf.Rank.R0>>.
      .pow<tf.Tensor<tf.Rank.R0>>(2)
      .mul<tf.Tensor<tf.Rank.R0>>(0.001)
      .add<tf.Tensor<tf.Rank.R0>>(thDot.pow(2).mul(0.1))
      .add<tf.Tensor<tf.Rank.R0>>(this._angleNormalize(th).pow(2));

    const newThDot = clippedAction
      .sum<tf.Tensor<tf.Rank.R0>>() // Converts tf.Tensor1D to <tf.Tensor<tf.Rank.R0>>.
      .mul<tf.Tensor<tf.Rank.R0>>(3)
      .div<tf.Tensor<tf.Rank.R0>>(m * l ** 2)
      .add<tf.Tensor<tf.Rank.R0>>(th.sin().mul(3 * g).div(2 * l))
      .mul<tf.Tensor<tf.Rank.R0>>(dt)
      .add<tf.Tensor<tf.Rank.R0>>(thDot)
      .clipByValue<tf.Tensor<tf.Rank.R0>>(-this.maxSpeed, this.maxSpeed) as tf.Tensor<tf.Rank.R0>;
    const newTh = newThDot
      .mul<tf.Tensor<tf.Rank.R0>>(dt)
      .add<tf.Tensor<tf.Rank.R0>>(th);

    this.state = {
      th: newTh,
      thDot: newThDot
    };

    return {
      observation: this._getObservation(),
      reward: costs.neg(),
      done: tf.tensor<tf.Rank.R0>(false),
    };
  }

  _angleNormalize<T extends tf.Tensor>(x: T): T {
    return x.add(Math.PI).mod(2 * Math.PI).add(- Math.PI);
  }

  _getObservation(): tf.Tensor1D {
    const { th, thDot } = this.state;
    const observation = tf.concat<tf.Tensor1D>([
      th.cos().expandDims<tf.Tensor1D>(),
      th.sin().expandDims<tf.Tensor1D>(),
      thDot.expandDims<tf.Tensor1D>(),
    ]);
    return observation;
  }

}
