import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("VotingSimple", function () {
  

  async function deployVotingFixture() {
    const candidateNames = ["Alice", "Bob", "Charlie"];
    
 
    const conn = await hre.network.connect();
    const accounts = await conn.provider.request({ method: "eth_accounts" });
    

    const artifact = await hre.artifacts.readArtifact("VotingSimple");

    const abiCoder = new ethers.AbiCoder();
    const encodedParams = abiCoder.encode(["string[]"], [candidateNames]);
    const deployData = artifact.bytecode + encodedParams.slice(2);
    
   
    const txHash = await conn.provider.request({
      method: "eth_sendTransaction",
      params: [{
        from: accounts[0],
        data: deployData,
        gas: "0x500000",
      }],
    });
    
    const receipt = await conn.provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    
    return {
      contractAddress: receipt.contractAddress,
      owner: accounts[0],
      voter1: accounts[1],
      voter2: accounts[2],
      nonVoter: accounts[3],
      conn,
      artifact,
    };
  }


  async function callView(conn, contractAddress, artifact, functionName, args = []) {
    const iface = new ethers.Interface(artifact.abi);
    const data = iface.encodeFunctionData(functionName, args);
    
    const result = await conn.provider.request({
      method: "eth_call",
      params: [{ to: contractAddress, data }, "latest"],
    });
    
    return iface.decodeFunctionResult(functionName, result);
  }


  async function sendTx(conn, from, contractAddress, artifact, functionName, args = []) {
    const iface = new ethers.Interface(artifact.abi);
    const data = iface.encodeFunctionData(functionName, args);
    
    const txHash = await conn.provider.request({
      method: "eth_sendTransaction",
      params: [{
        from,
        to: contractAddress,
        data,
        gas: "0x100000",
      }],
    });
    
    return conn.provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
  }


  describe("Déploiement", function () {
    it("Doit initialiser le owner correctement", async function () {
      const { conn, contractAddress, artifact, owner } = await deployVotingFixture();
      const result = await callView(conn, contractAddress, artifact, "owner");
      expect(result[0].toLowerCase()).to.equal(owner.toLowerCase());
    });

    it("Doit initialiser 3 candidats", async function () {
      const { conn, contractAddress, artifact } = await deployVotingFixture();
      const result = await callView(conn, contractAddress, artifact, "getCandidateCount");
      expect(result[0]).to.equal(3n);
    });

    it("Doit initialiser les candidats avec 0 votes", async function () {
      const { conn, contractAddress, artifact } = await deployVotingFixture();
      const result = await callView(conn, contractAddress, artifact, "getCandidate", [0]);
      expect(result[0]).to.equal("Alice");
      expect(result[1]).to.equal(0n);
    });

    it("Doit initialiser le vote comme fermé", async function () {
      const { conn, contractAddress, artifact } = await deployVotingFixture();
      const result = await callView(conn, contractAddress, artifact, "votingOpen");
      expect(result[0]).to.equal(false);
    });
  });

  describe("Gestion des électeurs", function () {
    it("L'admin peut ajouter un électeur", async function () {
      const { conn, contractAddress, artifact, owner, voter1 } = await deployVotingFixture();
      await sendTx(conn, owner, contractAddress, artifact, "addVoter", [voter1]);
      
      const result = await callView(conn, contractAddress, artifact, "isVoter", [voter1]);
      expect(result[0]).to.equal(true);
    });

    it("Un non-admin ne peut PAS ajouter d'électeur", async function () {
      const { conn, contractAddress, artifact, voter1, voter2 } = await deployVotingFixture();
      
      try {
        await sendTx(conn, voter1, contractAddress, artifact, "addVoter", [voter2]);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(true).to.equal(true);
      }
    });
  });

 
  describe("Ouverture du vote", function () {
    it("L'admin peut ouvrir le vote", async function () {
      const { conn, contractAddress, artifact, owner } = await deployVotingFixture();
      await sendTx(conn, owner, contractAddress, artifact, "startVoting", []);
      
      const result = await callView(conn, contractAddress, artifact, "votingOpen");
      expect(result[0]).to.equal(true);
    });

    it("L'admin peut fermer le vote", async function () {
      const { conn, contractAddress, artifact, owner } = await deployVotingFixture();
      await sendTx(conn, owner, contractAddress, artifact, "startVoting", []);
      await sendTx(conn, owner, contractAddress, artifact, "endVoting", []);
      
      const result = await callView(conn, contractAddress, artifact, "votingOpen");
      expect(result[0]).to.equal(false);
    });
  });

 
  describe("Vote", function () {
    it("Un électeur autorisé peut voter", async function () {
      const { conn, contractAddress, artifact, owner, voter1 } = await deployVotingFixture();
      
      await sendTx(conn, owner, contractAddress, artifact, "addVoter", [voter1]);
      await sendTx(conn, owner, contractAddress, artifact, "startVoting", []);
      await sendTx(conn, voter1, contractAddress, artifact, "vote", [0]);
      
      const result = await callView(conn, contractAddress, artifact, "getCandidate", [0]);
      expect(result[1]).to.equal(1n);
    });

    it("Un électeur ne peut voter qu'une seule fois", async function () {
      const { conn, contractAddress, artifact, owner, voter1 } = await deployVotingFixture();
      
      await sendTx(conn, owner, contractAddress, artifact, "addVoter", [voter1]);
      await sendTx(conn, owner, contractAddress, artifact, "startVoting", []);
      await sendTx(conn, voter1, contractAddress, artifact, "vote", [0]);
      
      try {
        await sendTx(conn, voter1, contractAddress, artifact, "vote", [1]);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(true).to.equal(true);
      }
    });

    it("Un non-électeur ne peut PAS voter", async function () {
      const { conn, contractAddress, artifact, owner, nonVoter } = await deployVotingFixture();
      
      await sendTx(conn, owner, contractAddress, artifact, "startVoting", []);
      
      try {
        await sendTx(conn, nonVoter, contractAddress, artifact, "vote", [0]);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(true).to.equal(true);
      }
    });
  });


  describe("Résultats", function () {
    it("getWinner retourne le bon candidat", async function () {
      const { conn, contractAddress, artifact, owner, voter1, voter2 } = await deployVotingFixture();
      
      await sendTx(conn, owner, contractAddress, artifact, "addVoter", [voter1]);
      await sendTx(conn, owner, contractAddress, artifact, "addVoter", [voter2]);
      await sendTx(conn, owner, contractAddress, artifact, "startVoting", []);
      
      await sendTx(conn, voter1, contractAddress, artifact, "vote", [1]);
      await sendTx(conn, voter2, contractAddress, artifact, "vote", [1]);
      
      const result = await callView(conn, contractAddress, artifact, "getWinner");
      expect(result[0]).to.equal(1n);
      expect(result[1]).to.equal("Bob");
      expect(result[2]).to.equal(2n);
    });
  });
});