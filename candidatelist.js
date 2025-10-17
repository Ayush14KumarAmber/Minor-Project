import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractAddress, contractABI } from "../utils/contractConfig";

const CandidateList = ({ signer }) => {
  const [candidates, setCandidates] = useState([]);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (signer) {
      const c = new ethers.Contract(contractAddress, contractABI, signer);
      setContract(c);
      loadCandidates(c);
    }
  }, [signer]);

  async function loadCandidates(c) {
    const data = await c.getCandidates();
    setCandidates(data);
  }

  async function vote(index) {
    try {
      setLoading(true);
      const tx = await contract.vote(index);
      await tx.wait();
      alert("Vote cast successfully!");
      loadCandidates(contract);
    } catch (e) {
      alert(e.reason || "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>🗳️ Candidates</h2>
      {candidates.map((cand, i) => (
        <div key={i} className="candidate-card">
          <h3>{cand.name}</h3>
          <p>Votes: {cand.voteCount.toString()}</p>
          <button onClick={() => vote(i)} disabled={loading}>
            Vote
          </button>
        </div>
      ))}
    </div>
  );
};

export default CandidateList;
