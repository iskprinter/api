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

  static DEFAULT_X = Math.PI;
  static DEFAULT_Y = 1.0

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
    this.maxTorque = 2.0;
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

  reset(): { th: tf.Tensor<tf.Rank.R0>, thDot: tf.Tensor<tf.Rank.R0> } { 
    this.state = {
      th: tf.tensor<tf.Rank.R0>((Math.random() - 0.5) / 0.5 * Math.PI),
      thDot: tf.tensor<tf.Rank.R0>((Math.random() - 0.5) / 0.5 * 1),
    };

    const high = tf.tensor1d([1.0, 1.0, this.maxSpeed]);
    const shape: [number] = [1];
    this.actionSpace = new Box({
      low: tf.fill<tf.Rank.R1>(shape, -this.maxTorque),
      high: tf.fill<tf.Rank.R1>(shape, this.maxTorque),
      shape,
    });
    this.observationSpace = new Box({
      low: high.mul<tf.Tensor1D>(-1),
      high,
      shape,
    });
    this.rewardRange = [0];

    return this.state;
  }

  step(action: tf.Tensor<tf.Rank.R0>): { observation: { th: tf.Tensor<tf.Rank.R0>, thDot: tf.Tensor<tf.Rank.R0> }, reward: tf.Tensor<tf.Rank.R0>, done: tf.Tensor<tf.Rank.R0> } {
    const { th, thDot } = this.state;
    const g = this.g
    const m = this.m
    const l = this.l
    const dt = this.dt

    const clippedAction = tf.clipByValue(action, -this.maxTorque, this.maxTorque);
    const costs = clippedAction
      .pow<tf.Tensor<tf.Rank.R0>>(2)
      .mul<tf.Tensor<tf.Rank.R0>>(0.001)
      .add<tf.Tensor<tf.Rank.R0>>(thDot.pow(2).mul(0.1))
      .add<tf.Tensor<tf.Rank.R0>>(this._angle_normalize(th).pow(2));

    const newThDotUnclipped = (clippedAction
      .mul<tf.Tensor<tf.Rank.R0>>(3)
      .div<tf.Tensor<tf.Rank.R0>>(m * l ** 2)
      .add<tf.Tensor<tf.Rank.R0>>(th.sin().mul(3 * g).div(2 * l))
    )
      .mul<tf.Tensor<tf.Rank.R0>>(dt)
      .add<tf.Tensor<tf.Rank.R0>>(thDot);
    const newThDot = tf.clipByValue(newThDotUnclipped, -this.maxSpeed, this.maxSpeed);
    const newTh = newThDot
      .mul<tf.Tensor<tf.Rank.R0>>(dt)
      .add<tf.Tensor<tf.Rank.R0>>(th);

    this.state = {
      th: newTh,
      thDot: newThDot
    };

    // if (this.renderMode == "human") {
    //     this.render();
    // }
    return {
      observation: this.state,
      reward: costs.neg().sum(),
      done: tf.tensor<tf.Rank.R0>(false),
    };
  }

  _angle_normalize<T extends tf.Tensor>(x: T): T {
    return x.add(Math.PI).mod(2 * Math.PI).add(- Math.PI);
  }

  //     def reset(this, *, seed: Optional[int] = None, options: Optional[dict] = None):
  //         super().reset(seed=seed)
  //         if options is None:
  //             high = np.array([DEFAULT_X, DEFAULT_Y])
  //         else:
  //             # Note that if you use custom reset bounds, it may lead to out-of-bound
  //             # state/observations.
  //             x = options.get("x_init") if "x_init" in options else DEFAULT_X
  //             y = options.get("y_init") if "y_init" in options else DEFAULT_Y
  //             x = utils.verify_number_and_cast(x)
  //             y = utils.verify_number_and_cast(y)
  //             high = np.array([x, y])
  //         low = -high  # We enforce symmetric limits.
  //         this.state = this.np_random.uniform(low=low, high=high)
  //         this.last_u = None

  //         if this.render_mode == "human":
  //             this.render()
  //         return this._get_obs(), {}

  //     def render(this):
  //         if this.render_mode is None:
  //             gym.logger.warn(
  //                 "You are calling render method without specifying any render mode. "
  //                 "You can specify the render_mode at initialization, "
  //                 f'e.g. gym("{this.spec.id}", render_mode="rgb_array")'
  //             )
  //             return

  //         try:
  //             import pygame
  //             from pygame import gfxdraw
  //         except ImportError:
  //             raise DependencyNotInstalled(
  //                 "pygame is not installed, run `pip install gym[classic_control]`"
  //             )

  //         if this.screen is None:
  //             pygame.init()
  //             if this.render_mode == "human":
  //                 pygame.display.init()
  //                 this.screen = pygame.display.set_mode(
  //                     (this.screen_dim, this.screen_dim)
  //                 )
  //             else:  # mode in "rgb_array"
  //                 this.screen = pygame.Surface((this.screen_dim, this.screen_dim))
  //         if this.clock is None:
  //             this.clock = pygame.time.Clock()

  //         this.surf = pygame.Surface((this.screen_dim, this.screen_dim))
  //         this.surf.fill((255, 255, 255))

  //         bound = 2.2
  //         scale = this.screen_dim / (bound * 2)
  //         offset = this.screen_dim // 2

  //         rod_length = 1 * scale
  //         rod_width = 0.2 * scale
  //         l, r, t, b = 0, rod_length, rod_width / 2, -rod_width / 2
  //         coords = [(l, b), (l, t), (r, t), (r, b)]
  //         transformed_coords = []
  //         for c in coords:
  //             c = pygame.math.Vector2(c).rotate_rad(this.state[0] + np.pi / 2)
  //             c = (c[0] + offset, c[1] + offset)
  //             transformed_coords.append(c)
  //         gfxdraw.aapolygon(this.surf, transformed_coords, (204, 77, 77))
  //         gfxdraw.filled_polygon(this.surf, transformed_coords, (204, 77, 77))

  //         gfxdraw.aacircle(this.surf, offset, offset, int(rod_width / 2), (204, 77, 77))
  //         gfxdraw.filled_circle(
  //             this.surf, offset, offset, int(rod_width / 2), (204, 77, 77)
  //         )

  //         rod_end = (rod_length, 0)
  //         rod_end = pygame.math.Vector2(rod_end).rotate_rad(this.state[0] + np.pi / 2)
  //         rod_end = (int(rod_end[0] + offset), int(rod_end[1] + offset))
  //         gfxdraw.aacircle(
  //             this.surf, rod_end[0], rod_end[1], int(rod_width / 2), (204, 77, 77)
  //         )
  //         gfxdraw.filled_circle(
  //             this.surf, rod_end[0], rod_end[1], int(rod_width / 2), (204, 77, 77)
  //         )

  //         fname = path.join(path.dirname(__file__), "assets/clockwise.png")
  //         img = pygame.image.load(fname)
  //         if this.last_u is not None:
  //             scale_img = pygame.transform.smoothscale(
  //                 img,
  //                 (scale * np.abs(this.last_u) / 2, scale * np.abs(this.last_u) / 2),
  //             )
  //             is_flip = bool(this.last_u > 0)
  //             scale_img = pygame.transform.flip(scale_img, is_flip, True)
  //             this.surf.blit(
  //                 scale_img,
  //                 (
  //                     offset - scale_img.get_rect().centerx,
  //                     offset - scale_img.get_rect().centery,
  //                 ),
  //             )

  //         # drawing axle
  //         gfxdraw.aacircle(this.surf, offset, offset, int(0.05 * scale), (0, 0, 0))
  //         gfxdraw.filled_circle(this.surf, offset, offset, int(0.05 * scale), (0, 0, 0))

  //         this.surf = pygame.transform.flip(this.surf, False, True)
  //         this.screen.blit(this.surf, (0, 0))
  //         if this.render_mode == "human":
  //             pygame.event.pump()
  //             this.clock.tick(this.metadata["renderFps"])
  //             pygame.display.flip()

  //         else:  # mode == "rgb_array":
  //             return np.transpose(
  //                 np.array(pygame.surfarray.pixels3d(this.screen)), axes=(1, 0, 2)
  //             )

  //     def close(this):
  //         if this.screen is not None:
  //             import pygame

  //             pygame.display.quit()
  //             pygame.quit()
  //             this.isopen = False

}
