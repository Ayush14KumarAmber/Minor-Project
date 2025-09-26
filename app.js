(() => {
  const { BrowserProvider, Contract, parseEther } = ethers;

  const factoryAbi = [
    "function createPoll(string[] descriptions, bool quadratic, uint256 startTime, uint256 endTime) returns (uint256 id, address pollAddr)",
    "function totalPolls() view returns (uint256)",
    "function getPoll(uint256 id) view returns (tuple(address poll, address owner, bool quadratic, uint256 startTime, uint256 endTime))"
  ];

  const votingAbi = [
    "function phase() view returns (uint8)",
    "function quadratic() view returns (bool)",
    "function startTime() view returns (uint256)",
    "function endTime() view returns (uint256)",
    "function proposalCount() view returns (uint256)",
    "function getProposal(uint256 id) view returns (string, uint256)",
    "function startRegistration()",
    "function startVoting()",
    "function endPoll()",
    "function registerVoters(address[] voters)",
    "function delegate(address to)",
    "function undelegate()",
    "function vote(uint256 id)",
    "function owner() view returns (address)",
  ];

  let provider, signer, accounts;
  let factoryContract;
  let activePollAddress;
  let activePoll;

  const byId = (id) => document.getElementById(id);
  const $connect = byId('connectBtn');
  const $loadFactory = byId('loadFactory');
  const $createPoll = byId('createPoll');
  const $loadPoll = byId('loadPoll');

  async function connect() {
    if (!window.ethereum) return alert('MetaMask required');
    provider = new BrowserProvider(window.ethereum);
    accounts = await provider.send('eth_requestAccounts', []);
    signer = await provider.getSigner();
    const network = await provider.getNetwork();
    byId('networkInfo').textContent = `Connected ${network.name} (${network.chainId}) as ${accounts[0]}`;
  }

  async function loadFactory() {
    const addr = byId('factoryAddress').value.trim();
    if (!addr) return alert('Enter factory address');
    factoryContract = new Contract(addr, factoryAbi, signer || provider);
    alert('Factory loaded');
  }

  async function createPoll() {
    if (!factoryContract) return alert('Load factory first');
    const raw = byId('proposals').value.trim();
    const proposals = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (proposals.length < 2) return alert('Need at least 2 proposals');
    const quadratic = byId('quadratic').checked;
    const now = Math.floor(Date.now() / 1000);
    const start = now + parseInt(byId('startMins').value || '1', 10) * 60;
    const end = start + parseInt(byId('durationMins').value || '60', 10) * 60;

    byId('createStatus').textContent = 'Creating poll...';
    try {
      const tx = await factoryContract.connect(signer).createPoll(proposals, quadratic, start, end);
      const rc = await tx.wait();
      const log = rc.logs.find(l => l.fragment && l.fragment.name === 'PollCreated');
      if (log) {
        const id = log.args[0];
        const addr = log.args[1];
        byId('createStatus').textContent = `Poll created id=${id} address=${addr}`;
        byId('pollId').value = id.toString();
        byId('pollInfo').textContent = addr;
      } else {
        byId('createStatus').textContent = 'Poll created (inspect tx)';
      }
    } catch (e) {
      console.error(e);
      byId('createStatus').textContent = e.message || 'Error creating poll';
    }
  }

  async function loadPoll() {
    const id = parseInt(byId('pollId').value || '-1', 10);
    if (Number.isNaN(id)) return alert('Enter poll id');
    const addr = await factoryContract.getPoll(id).then(p => p.poll);
    activePollAddress = addr;
    activePoll = new Contract(addr, votingAbi, signer || provider);
    await refreshPoll();
  }

  async function refreshPoll() {
    const titleEl = byId('pollTitle');
    const phaseEl = byId('phaseInfo');
    const timeEl = byId('timeInfo');
    const listEl = byId('proposalsList');

    const phase = await activePoll.phase();
    const quadratic = await activePoll.quadratic();
    const start = Number(await activePoll.startTime());
    const end = Number(await activePoll.endTime());

    titleEl.textContent = `Poll ${activePollAddress.slice(0,8)}... (${quadratic ? 'Quadratic' : 'Linear'})`;
    phaseEl.textContent = ['Created','Registration','Voting','Ended'][Number(phase)] || 'Unknown';

    const now = Math.floor(Date.now() / 1000);
    timeEl.textContent = `Now ${now} | Starts ${start} | Ends ${end}`;

    const count = Number(await activePoll.proposalCount());
    listEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const [desc, votes] = await activePoll.getProposal(i);
      const item = document.createElement('div');
      item.className = 'card';
      item.innerHTML = `<strong>#${i}</strong> ${desc}<div class='muted'>Votes: ${votes}</div>`;
      listEl.appendChild(item);
    }

    byId('pollSection').style.display = 'block';
  }

  async function register() {
    const raw = byId('registerList').value.trim();
    if (!raw) return alert('Enter addresses');
    const addrs = raw.split(',').map(s => s.trim());
    const tx = await activePoll.connect(signer).registerVoters(addrs);
    await tx.wait();
    byId('actionStatus').textContent = 'Registered';
  }

  async function delegate() {
    const to = byId('delegateTo').value.trim();
    const tx = await activePoll.connect(signer).delegate(to);
    await tx.wait();
    byId('actionStatus').textContent = 'Delegated';
  }

  async function undelegate() {
    const tx = await activePoll.connect(signer).undelegate();
    await tx.wait();
    byId('actionStatus').textContent = 'Undelegated';
  }

  async function vote() {
    const id = parseInt(byId('voteProposalId').value || '-1', 10);
    const tx = await activePoll.connect(signer).vote(id);
    await tx.wait();
    byId('actionStatus').textContent = 'Voted';
    await refreshPoll();
  }

  async function startReg() { await (await activePoll.connect(signer).startRegistration()).wait(); await refreshPoll(); }
  async function startVote() { await (await activePoll.connect(signer).startVoting()).wait(); await refreshPoll(); }
  async function endPoll() { await (await activePoll.connect(signer).endPoll()).wait(); await refreshPoll(); }

  $connect.onclick = connect;
  $loadFactory.onclick = loadFactory;
  $createPoll.onclick = createPoll;
  $loadPoll.onclick = loadPoll;

  byId('registerBtn').onclick = register;
  byId('delegateBtn').onclick = delegate;
  byId('undelegateBtn').onclick = undelegate;
  byId('voteBtn').onclick = vote;
  byId('startRegBtn').onclick = startReg;
  byId('startVoteBtn').onclick = startVote;
  byId('endPollBtn').onclick = endPoll;
})();
