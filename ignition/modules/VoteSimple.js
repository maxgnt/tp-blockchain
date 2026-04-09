import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VoteSimpleModule = buildModule("VoteSimpleModule", (m) => {
  const nomsCandidats = ["Alice", "Bob", "Charlie"];

  const voteSimple = m.contract("VoteSimple", [nomsCandidats]);

  return { voteSimple };
});

export default VoteSimpleModule;