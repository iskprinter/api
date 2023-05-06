import DdpgAgent from "./DdpgAgent";
import Environment from "./Environment";
import Pendulum from "./test/Pendulum";

describe('DdpgAgent', () => {
  let agent: DdpgAgent;

  it('acts and learns', () => {

    const env: Environment = new Pendulum();
    agent = new DdpgAgent({
        env,
        stateShape: env.getObservationSpace().shape,
        nActions: env.getActionSpace().shape[0],
    });
    const nGames = 250;

    let bestScore = env.getRewardRange()[0];
    const scoreHistory = [];
    const loadCheckpoint = false;

    const evaluate = (() => {
      if (!loadCheckpoint) {
        return false;
      }
      for (let nSteps = 0; nSteps <= agent.batchSize; nSteps += 1) {
          const observation = env.reset();
          const action = env.getActionSpace().sample();
          const {
            done,
            observation: nextObservation,
            reward,
          } = env.step(action);
          agent.remember(observation, action, reward, nextObservation, done);
      }
      agent.learn();
      agent.loadModels();
      return true
    })();

    for (let i = 0; i < nGames; i += 1) {
        let observation = env.reset();
        let score = 0;
        for (let i = 0; i < 200; i += 1) {
            const action = agent.chooseAction(observation, evaluate);
            const {
              observation: nextObservation,
              reward,
              done
            } = env.step(action);
            score += reward.bufferSync().get();
            agent.remember(observation, action, reward, nextObservation, done);
            if (!loadCheckpoint) {
              agent.learn();
            }
            observation = nextObservation;
        }
        scoreHistory.push(score);
        const avgScore = scoreHistory
          .slice(-100)
          .reduce((sum, score) => sum + score, 0);

        if (avgScore > bestScore) {
            bestScore = avgScore;
            if (!loadCheckpoint) {
                agent.saveModels();
            }
        }

        console.log(`episode:\t${i}\nscore:\t${score}\navg score:\t${avgScore}`)
    }

    if (!loadCheckpoint) {
        for (let i = 1; i <= nGames; i += 1) {
          console.log(`game = ${i}, score = ${scoreHistory[i]}`);
        }    
    }

  });
});
