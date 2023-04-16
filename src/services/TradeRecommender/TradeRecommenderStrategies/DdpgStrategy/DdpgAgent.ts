import * as tf from '@tensorflow/tfjs';
import ReplayBuffer from './ReplayBuffer';
import Actor from './Actor';
import Critic from './Critic';

// Inspired by https://github.com/philtabor/Youtube-Code-Repository/tree/eb3aa9733158a4f7c4ba1fefaa812b27ffd889b6/ReinforcementLearning/PolicyGradient/DDPG/tensorflow2/pendulum
export default class DdpgAgent {
  actor: Actor;
  alpha: number;
  batchSize: number;
  beta: number;
  critic: Critic;
  env: any;
  fc1: number;
  fc2: number;
  gamma: number;
  inputLength: number;
  maxAction: number;
  maxMemorySize: number;
  minAction: number;
  nActions: number;
  noise: number;
  replayBuffer: ReplayBuffer;
  stateLength: number;
  targetActor: Actor;
  targetCritic: Critic;
  tau: number;
  constructor(
    {
      alpha = 0.001,
      batchSize = 1,
      beta = 0.002,
      env,
      fc1 = 8,
      fc2 = 8,
      gamma = 0.99,
      inputLength,
      maxMemorySize = 1024,
      stateLength,
      nActions,
      noise = 0.1,
      tau = 0.005,
    }: {
      alpha?: number;
      batchSize?: number;
      beta?: number;
      env: any;
      fc1?: number;
      fc2?: number;
      gamma?: number;
      inputLength: number;
      maxMemorySize?: number;
      stateLength: number;
      nActions: number;
      noise?: number;
      tau?: number;
    }
  ) {
    this.alpha = alpha;
    this.batchSize = batchSize;
    this.beta = beta;
    this.env = env;
    this.fc1 = fc1;
    this.fc2 = fc2;
    this.gamma = gamma;
    this.inputLength = inputLength;
    this.maxMemorySize = maxMemorySize;
    this.nActions = nActions;
    this.stateLength = stateLength;
    this.noise = noise;
    this.tau = tau;

    this.replayBuffer = new ReplayBuffer({
      maxSize: this.maxMemorySize,
      inputLength: this.inputLength,
    })

    this.maxAction = env.action_space.high[0]
    this.minAction = env.action_space.low[0]

    this.actor = new Actor({ nActions, stateLength });
    this.critic = new Critic({ nActions, stateLength });
    this.targetActor = new Actor({ nActions, stateLength, name: 'targetActor' });
    this.targetCritic = new Critic({ nActions, stateLength, name: 'targetCritic' });

    const beta1 = 0.9;  // The default for Python3 per https://www.tensorflow.org/api_docs/python/tf/keras/optimizers/Adam
    const beta2 = 0.999;  // The default for Python3 per https://www.tensorflow.org/api_docs/python/tf/keras/optimizers/Adam
    this.actor.compile(new tf.AdamOptimizer(this.alpha, beta1, beta2));
    this.critic.compile(new tf.AdamOptimizer(this.beta, beta1, beta2));
    this.targetActor.compile(new tf.AdamOptimizer(this.alpha, beta1, beta2));
    this.targetCritic.compile(new tf.AdamOptimizer(this.beta, beta1, beta2));

    this.updateNetworkParameters({ tau: 1 });
  }

  updateNetworkParameters({ tau }: { tau: number }) {
    const nextActorWeights: tf.Tensor<tf.Rank>[] = [];
    const targetActorWeights = this.targetActor.model.getWeights();
    const actorWeights = this.targetActor.model.getWeights();
    for (let i = 0; i < actorWeights.length; i += 1) {
      nextActorWeights.push((actorWeights[i].mul(tau)).add((targetActorWeights[i].mul(1 - tau))));
    }
    this.targetActor.model.setWeights(nextActorWeights);

    const nextCriticWeights: tf.Tensor<tf.Rank>[] = [];
    const targetCriticWeights = this.targetCritic.model.getWeights();
    const criticWeights = this.targetCritic.model.getWeights();
    for (let i = 0; i < actorWeights.length; i += 1) {
      nextCriticWeights.push((criticWeights[i].mul(tau)).add((targetCriticWeights[i].mul(1 - tau))));
    }
    this.targetCritic.model.setWeights(nextCriticWeights);
  }

  remember(state: tf.Tensor1D, action: tf.Tensor<tf.Rank.R0>, reward: tf.Tensor<tf.Rank.R0>, newState: tf.Tensor1D, done: tf.Tensor<tf.Rank.R0>) {
    this.replayBuffer.storeTransition(state, action, reward, newState, done);
    return this;
  }

  async saveModels() {
    console.log('... saving models ...')
    await Promise.all([
      this.actor.model.save(this.actor.checkpointFile),
      this.targetActor.model.save(this.targetActor.checkpointFile),
      this.critic.model.save(this.critic.checkpointFile),
      this.targetCritic.model.save(this.targetCritic.checkpointFile),
    ]);
  }

  async loadModels() {
    console.log('... loading models ...')
    const [
      actorModel,
      targetActorModel,
      criticModel,
      targetCriticModel,
    ] = await Promise.all([
      tf.loadLayersModel(this.actor.checkpointFile),
      tf.loadLayersModel(this.targetActor.checkpointFile),
      tf.loadLayersModel(this.critic.checkpointFile),
      tf.loadLayersModel(this.targetCritic.checkpointFile),
    ])
    this.actor.model = actorModel;
    this.targetActor.model = targetActorModel;
    this.critic.model = criticModel;
    this.targetCritic.model = targetCriticModel;
  }

  chooseAction(observation: any, evaluate = false): tf.Tensor<tf.Rank.R0> {
    const state = tf.tensor1d([observation], 'float32');
    const actions = this.actor.model.apply(state) as tf.Tensor<tf.Rank.R0>;
    if (!evaluate) {
      const mean = 0;
      const stdDev = this.noise;
      // note that if the env has an action > 1, we have to multiply by
      // max action at some point
      actions.add(tf.randomNormal([this.nActions], mean, stdDev));
    }
    const clippedActions = tf.clipByValue(actions, this.minAction, this.maxAction);
    return clippedActions;
  }

  learn() {
    if (this.replayBuffer.memoryCounter < this.batchSize) {
      return;
    }

    const {
      states,
      actions,
      rewards,
      nextStates,
      done
    } = this.replayBuffer.sampleBuffer(this.batchSize);

    // Compute the gradient of the loss for the Critic
    const criticLossFunction = () => {
      const targetActions = this.targetActor.model.predictOnBatch(nextStates) as tf.Tensor1D;

      // Target Q
      const targetCriticInputs = tf.concat2d([nextStates, targetActions.expandDims<tf.Tensor2D>(0)], 1);
      const targetCriticQsOfNextStates = tf.squeeze<tf.Tensor1D>(this.targetCritic.model.predictOnBatch(targetCriticInputs) as tf.Tensor2D);
      const targetQs = rewards.add<tf.Tensor1D>(targetCriticQsOfNextStates.mul(this.gamma).mul((done.mul(-1).add(1))))

      // Actual Q
      const criticInput = tf.concat2d([states, actions.expandDims<tf.Tensor2D>(0)], 1);
      const criticQValue = tf.squeeze<tf.Tensor1D>(this.critic.model.predictOnBatch(criticInput) as tf.Tensor2D);

      // MSE
      const criticLoss = tf.losses.meanSquaredError<tf.Tensor1D, tf.Tensor<tf.Rank.R0>>(targetQs, criticQValue)
      return criticLoss;
    };
    // Per https://stackoverflow.com/questions/74889481/ddpg-training-in-tensorflow-js
    const criticTrainableVars = this.critic.model.getWeights(true) as tf.Variable<tf.Rank>[];
    const criticGradient = tf.variableGrads(criticLossFunction, criticTrainableVars);
    this.critic.model.optimizer.applyGradients(criticGradient.grads);

    // Compute the gradient of the loss for the Actor
    const actorLossFunction = () => {
      const actions = this.actor.model.predictOnBatch(states) as tf.Tensor1D;
      const criticQs = this.critic.model.predict(tf.concat2d([states, actions.expandDims<tf.Tensor2D>(0)], 1)) as tf.Tensor1D;
      const actorLoss = tf.mean<tf.Tensor<tf.Rank.R0>>(criticQs.mul(-1));
      return actorLoss;
    };
    const actorTrainableVars = this.actor.model.getWeights(true) as tf.Variable<tf.Rank>[];
    const actorGradient = tf.variableGrads(actorLossFunction, actorTrainableVars);
    this.actor.model.optimizer.applyGradients(actorGradient.grads);

    this.updateNetworkParameters({ tau: this.tau });
  }
}
