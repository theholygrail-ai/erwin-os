const { ResearcherAgent } = require('./researcher');
const { PlannerAgent } = require('./planner');
const { BuilderAgent } = require('./builder');
const { VerifierAgent } = require('./verifier');
const { AGENT_NAMES } = require('@erwin-os/schemas');

const agents = {
  [AGENT_NAMES.RESEARCHER]: ResearcherAgent,
  [AGENT_NAMES.PLANNER]: PlannerAgent,
  [AGENT_NAMES.BUILDER]: BuilderAgent,
  [AGENT_NAMES.VERIFIER]: VerifierAgent,
};

async function runAgent(agentName, params) {
  const AgentClass = agents[agentName];
  if (!AgentClass) throw new Error(`Unknown agent: ${agentName}`);

  const agent = new AgentClass(params);
  return agent.execute();
}

module.exports = { runAgent, ResearcherAgent, PlannerAgent, BuilderAgent, VerifierAgent };
