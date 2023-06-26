// import * as tf from '@tensorflow/tfjs-node';
// import ReplayBuffer from './ReplayBuffer';
// import Actor from './Actor';
// import Critic from './Critic';
// import Environment from './Environment';

// // Inspired by https://github.com/philtabor/Youtube-Code-Repository/tree/eb3aa9733158a4f7c4ba1fefaa812b27ffd889b6/ReinforcementLearning/PolicyGradient/DDPG/tensorflow2/pendulum
// export default class DdpgAgent {
//   actionShape: number[];
//   actor: Actor;
//   alpha: number;
//   batchSize: number;
//   beta: number;
//   critic: Critic;
//   env: Environment;
//   fc1: number;
//   fc2: number;
//   gamma: number;
//   maxAction: number;
//   minAction: number;
//   noise: number;
//   replayBuffer: ReplayBuffer;
//   targetActor: Actor;
//   targetCritic: Critic;
//   tau: number;
//   constructor(
//     {
//       actionShape,
//       alpha = 0.001,
//       batchSize = 1,
//       beta = 0.002,
//       env,
//       fc1 = 3,
//       fc2 = 3,
//       gamma = 0.99,
//       maxMemorySize = 1024 ** 2,
//       noise = 0.1,
//       observationShape,
//       tau = 0.005,
//     }: {
//       actionShape: number[];
//       alpha?: number;
//       batchSize?: number;
//       beta?: number;
//       env: Environment;
//       fc1?: number;
//       fc2?: number;
//       gamma?: number;
//       maxMemorySize?: number;
//       noise?: number;
//       observationShape: number[];
//       tau?: number;
//     }
//   ) {
//     this.actionShape = actionShape;
//     this.alpha = alpha;
//     this.batchSize = batchSize;
//     this.beta = beta;
//     this.env = env;
//     this.fc1 = fc1;
//     this.fc2 = fc2;
//     this.gamma = gamma;
//     this.noise = noise;
//     this.tau = tau;

//     this.replayBuffer = new ReplayBuffer({
//       actionShape,
//       maxSize: maxMemorySize,
//       observationShape: observationShape,
//     })

//     this.maxAction = env.getActionSpace().high.bufferSync().get(0);
//     this.minAction = env.getActionSpace().low.bufferSync().get(0);

//     const beta1 = 0.9;  // The default for Python3 per https://www.tensorflow.org/api_docs/python/tf/keras/optimizers/Adam
//     const beta2 = 0.999;  // The default for Python3 per https://www.tensorflow.org/api_docs/python/tf/keras/optimizers/Adam
//     this.actor = new Actor({
//       actionShape,
//       optimizer: new tf.AdamOptimizer(this.alpha, beta1, beta2),
//       observationShape,
//     });
//     this.critic = new Critic({
//       actionShape,
//       optimizer: new tf.AdamOptimizer(this.beta, beta1, beta2),
//       observationShape,
//     });
//     this.targetActor = new Actor({
//       actionShape,
//       name: 'targetActor',
//       optimizer: new tf.AdamOptimizer(this.alpha, beta1, beta2),
//       observationShape,
//     });
//     this.targetCritic = new Critic({
//       actionShape,
//       name: 'targetCritic',
//       optimizer: new tf.AdamOptimizer(this.beta, beta1, beta2),
//       observationShape,
//     });

//     this.updateNetworkParameters({ tau: 1 });
//   }

//   updateNetworkParameters({ tau }: { tau: number }) {
//     const nextActorWeights: tf.Tensor<tf.Rank>[] = [];
//     const targetActorWeights = this.targetActor.getWeights();
//     const actorWeights = this.actor.getWeights();
//     for (let i = 0; i < actorWeights.length; i += 1) {
//       nextActorWeights.push((actorWeights[i].mul(tau)).add((targetActorWeights[i].mul(1 - tau))));
//     }
//     this.targetActor.setWeights(nextActorWeights);

//     const nextCriticWeights: tf.Tensor<tf.Rank>[] = [];
//     const targetCriticWeights = this.targetCritic.getWeights();
//     const criticWeights = this.critic.getWeights();
//     for (let i = 0; i < criticWeights.length; i += 1) {
//       nextCriticWeights.push((criticWeights[i].mul(tau)).add((targetCriticWeights[i].mul(1 - tau))));
//     }
//     this.targetCritic.setWeights(nextCriticWeights);
//   }

//   remember(observation: tf.Tensor, action: tf.Tensor, reward: tf.Tensor<tf.Rank.R0>, nextObservation: tf.Tensor, done: tf.Tensor<tf.Rank.R0>) {
//     this.replayBuffer.storeTransition(observation, action, reward, nextObservation, done);
//     return this;
//   }

//   async saveModels(): Promise<DdpgAgent> {
//     await Promise.all([
//       this.actor.save(),
//       this.targetActor.save(),
//       this.critic.save(),
//       this.targetCritic.save(),
//     ]);
//     return this;
//   }

//   async loadModels(): Promise<DdpgAgent> {
//    await Promise.all([
//       this.actor.load(),
//       this.targetActor.load(),
//       this.critic.load(),
//       this.targetCritic.load(),
//     ]);
//     return this;
//   }

//   chooseAction(observation: tf.Tensor, explore = true): tf.Tensor {
//     let action = (this.actor.model.apply(observation.expandDims()) as tf.Tensor).squeeze([0]);
//     if (explore) {
//       const mean = 0;
//       const stdDev = this.noise;
//       action = action.add(tf.randomNormal(this.actionShape, mean, stdDev));
//     }
//     action = action
//       .mul(this.env.getActionSpace().high)
//       .clipByValue(this.minAction, this.maxAction);
//     return action;
//   }

//   learn() {
//     if (this.replayBuffer.memoryCounter < this.batchSize) {
//       return;
//     }

//     const {
//       observations,
//       actions,
//       rewards,
//       nextObservations,
//       done
//     } = this.replayBuffer.sampleBuffer(this.batchSize);

//     // Compute the gradient of the loss for the Critic
//     const criticLossFunction: () => tf.Scalar = () => {
//       const targetActions = this.targetActor.model.predictOnBatch(nextObservations) as tf.Tensor1D;

//       // Target Q
//       const targetCriticInputs = tf.concat([nextObservations, targetActions], 1);
//       const targetCriticQsOfNextStates = (this.targetCritic.model.predictOnBatch(targetCriticInputs) as tf.Tensor1D).squeeze([0]);
//       const targetQs = rewards.add<tf.Tensor1D>(targetCriticQsOfNextStates.mul(this.gamma).mul(done.toInt().neg().add(1)))

//       // Actual Q
//       const criticInput = tf.concat([observations, actions], 1);
//       const criticQValue = (this.critic.model.predictOnBatch(criticInput) as tf.Tensor2D).squeeze<tf.Tensor1D>([0]);

//       // MSE
//       const criticLoss = tf.losses.meanSquaredError<tf.Tensor1D, tf.Tensor<tf.Rank.R0>>(targetQs, criticQValue)
//       return criticLoss.asScalar();
//     };
//     // Per https://stackoverflow.com/questions/74889481/ddpg-training-in-tensorflow-js
//     const criticTrainableVars = this.critic.model.getWeights(true) as tf.Variable<tf.Rank>[];
//     const criticGradient = tf.variableGrads(criticLossFunction, criticTrainableVars);
//     this.critic.model.optimizer.applyGradients(criticGradient.grads);

//     // Compute the gradient of the loss for the Actor
//     const actorLossFunction: () => tf.Scalar = () => {
//       const actions = this.actor.model.predictOnBatch(observations) as tf.Tensor1D;
//       const criticInputs = tf.concat([observations, actions], 1);
//       const criticQs = (this.critic.model.predictOnBatch(criticInputs) as tf.Tensor1D).squeeze([0]);

//       // Loss
//       const actorLoss = tf.mean<tf.Tensor<tf.Rank.R0>>(criticQs.neg());
//       return actorLoss.asScalar();
//     };
//     const actorTrainableVars = this.actor.model.getWeights(true) as tf.Variable<tf.Rank>[];
//     const actorGradient = tf.variableGrads(actorLossFunction, actorTrainableVars);
//     this.actor.model.optimizer.applyGradients(actorGradient.grads);

//     this.updateNetworkParameters({ tau: this.tau });
//   }
// }
