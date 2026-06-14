import { useEffect, useRef, useState } from "react";
import Web3 from "web3";
import AdditionContract from "./contracts/Addition.json";
import ConvertisseurContract from "./contracts/Convertisseur.json";
import FormeContract from "./contracts/Forme.json";
import GestionChainesContract from "./contracts/GestionChaines.json";
import PariteContract from "./contracts/Parite.json";
import PaymentContract from "./contracts/Payment.json";
import PositifContract from "./contracts/Positif.json";
import RectangleContract from "./contracts/Rectangle.json";
import TableauContract from "./contracts/Tableau.json";
import "./App.css";

const LOCAL_RPC_URL = "http://127.0.0.1:7545";

const CONTRACTS = [
  {
    name: "Addition",
    exercise: 1,
    description: "Addition de deux nombres (lecture et calcul pur).",
    artifact: AdditionContract
  },
  {
    name: "Convertisseur",
    exercise: 2,
    description: "Conversion Ether ↔ Wei.",
    artifact: ConvertisseurContract
  },
  {
    name: "GestionChaines",
    exercise: 3,
    description: "Gestion de chaines: set/get, concat, longueur, comparaison.",
    artifact: GestionChainesContract
  },
  {
    name: "Positif",
    exercise: 4,
    description: "Test si un entier est positif.",
    artifact: PositifContract
  },
  {
    name: "Parite",
    exercise: 5,
    description: "Test si un entier est pair.",
    artifact: PariteContract
  },
  {
    name: "Tableau",
    exercise: 6,
    description: "Manipulation d'un tableau dynamique (ajout, get, somme).",
    artifact: TableauContract
  },
  {
    name: "Forme",
    exercise: 7,
    description: "Classe abstraite Forme (position, surface, infos).",
    artifact: FormeContract
  },
  {
    name: "Rectangle",
    exercise: 7,
    description: "Rectangle (longueur/largeur) avec surface et infos.",
    artifact: RectangleContract
  },
  {
    name: "Payment",
    exercise: 8,
    description: "Reception et retrait de paiements.",
    artifact: PaymentContract
  }
];

const stringifyValue = (value) => {
  if (value === null || value === undefined) return "n/a";
  if (typeof value === "string") return value;
  if (typeof value === "bigint") return value.toString();

  try {
    return JSON.stringify(
      value,
      (_, nestedValue) => (typeof nestedValue === "bigint" ? nestedValue.toString() : nestedValue),
      2
    );
  } catch {
    return String(value);
  }
};

const shortAddress = (value) => {
  if (!value) return "n/a";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
};

const cleanEventValues = (values) => {
  if (!values || typeof values !== "object") return {};
  return Object.fromEntries(Object.entries(values).filter(([key]) => Number.isNaN(Number(key))));
};

const buildEventLog = (event, source) => ({
  id: `${event.transactionHash || source}-${event.logIndex ?? event.blockNumber ?? Date.now()}`,
  name: event.event || event.signature || "Event",
  address: event.address || "n/a",
  blockNumber: event.blockNumber ?? null,
  transactionHash: event.transactionHash || "n/a",
  source,
  values: cleanEventValues(event.returnValues)
});

const mergeEventLogs = (currentLogs, nextLogs) => {
  const seen = new Set();
  const merged = [...nextLogs, ...currentLogs].filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  return merged.slice(0, 20);
};

const normalizeMethodArguments = (method, rawInputs) => {
  return (method.inputs || []).map((input, index) => {
    const rawValue = rawInputs[index];

    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return null;
    }

    if (input.type.startsWith("uint") || input.type.startsWith("int")) {
      return rawValue;
    }

    return rawValue;
  });
};

const hasMissingInputs = (method, rawInputs) => {
  return (method.inputs || []).some((_, index) => {
    const rawValue = rawInputs[index];
    return rawValue === undefined || rawValue === null || rawValue === "";
  });
};

const resolveDeployment = (artifact, networkId, chainId) => {
  const networks = artifact?.networks || {};
  const entries = Object.entries(networks);

  if (entries.length === 0) {
    return { address: null, networkKey: null, exactMatch: false };
  }

  const candidates = [networkId, chainId]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value));

  for (const candidate of candidates) {
    if (networks[candidate]?.address) {
      return {
        address: networks[candidate].address,
        networkKey: candidate,
        exactMatch: true
      };
    }
  }

  const [fallbackKey] = entries[0];
  return {
    address: null,
    networkKey: fallbackKey,
    exactMatch: false
  };
};

function App() {
  const [state, setState] = useState({
    web3: null,
    networkId: null,
    chainId: null,
    providerLabel: "Non connecte",
    injected: false
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [account, setAccount] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [balanceWei, setBalanceWei] = useState(null);
  const [latestBlock, setLatestBlock] = useState(null);
  const [lastTx, setLastTx] = useState(null);
  const [methodInputs, setMethodInputs] = useState({});
  const [methodResults, setMethodResults] = useState({});
  const [eventLogs, setEventLogs] = useState([]);
  const [eventRefreshKey, setEventRefreshKey] = useState(0);
  const eventTimerRef = useRef(null);
  const web3Ref = useRef(null);

  const selectedContract = CONTRACTS.find((c) => c.name === selected) || null;
  const selectedExercise = selectedContract?.exercise ?? null;
  const selectedTitle = selected
    ? (selectedExercise ? `Exercice ${selectedExercise} - ${selected}` : selected)
    : "";
  const selectedDescription = selectedContract?.description || "";
  const selectedDeployment = selectedContract
    ? resolveDeployment(selectedContract.artifact, state.networkId, state.chainId)
    : null;
  const selectedAddress = selectedDeployment?.address || null;
  const selectedNetworkMismatch = Boolean(
    selectedContract && selectedAddress && selectedDeployment && !selectedDeployment.exactMatch
  );
  const selectedDeploymentLabel = selectedDeployment?.networkKey
    ? `Réseau artefact: ${selectedDeployment.networkKey}`
    : "Réseau artefact: n/a";
  const isWalletConnected = Boolean(state.injected && account);
  const selectedMethods = selectedContract
    ? selectedContract.artifact.abi.filter((item) => item.type === "function")
    : [];
  const selectedEvents = selectedContract
    ? selectedContract.artifact.abi.filter((item) => item.type === "event")
    : [];

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "n/a";
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const formatEth = (wei) => {
    if (!state.web3 || wei === null || wei === undefined) return "n/a";
    return state.web3.utils.fromWei(String(wei), "ether");
  };

  const formatGwei = (wei) => {
    if (!state.web3 || wei === null || wei === undefined) return "n/a";
    return state.web3.utils.fromWei(String(wei), "gwei");
  };

  const syncChainSnapshot = async (instanceWeb3, preferredAccount = "") => {
    web3Ref.current = instanceWeb3;
    const networkId = await instanceWeb3.eth.net.getId();
    const chainId = await instanceWeb3.eth.getChainId();
    const accountsList = await instanceWeb3.eth.getAccounts();
    const nextAccount = preferredAccount || accountsList?.[0] || "";
    const balance = nextAccount ? await instanceWeb3.eth.getBalance(nextAccount) : null;
    const block = await instanceWeb3.eth.getBlock("latest", true);

    let txData = null;
    if (block?.transactions?.length) {
      const last = block.transactions[block.transactions.length - 1];
      const receipt = await instanceWeb3.eth.getTransactionReceipt(last.hash);
      const tx = await instanceWeb3.eth.getTransaction(last.hash);
      const balanceAfter = tx?.from ? await instanceWeb3.eth.getBalance(tx.from) : null;
      txData = { receipt, tx, block, balanceAfter, method: "n/a" };
    }

    setState((prev) => ({
      ...prev,
      web3: instanceWeb3,
      networkId,
      chainId
    }));
    setAccounts(accountsList);
    setAccount(nextAccount);
    setBalanceWei(balance);
    setLatestBlock(block || null);
    setLastTx(txData);
    return { networkId, chainId, accountsList };
  };

  const refreshWallet = async () => {
    if (!state.web3) {
      setError("Web3 n'est pas initialise.");
      return;
    }

    try {
      await syncChainSnapshot(state.web3, account);
      setStatus("Informations du wallet actualisees.");
      setError("");
    } catch (refreshError) {
      setError(refreshError?.message || "Impossible d'actualiser le wallet.");
    }
  };

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask n'est pas disponible dans ce navigateur.");
      return;
    }

    try {
      const requestedAccounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const instanceWeb3 = state.web3 || new Web3(window.ethereum);
      web3Ref.current = instanceWeb3;
      const snapshot = await syncChainSnapshot(instanceWeb3, requestedAccounts?.[0] || "");
      setState((prev) => ({
        ...prev,
        web3: instanceWeb3,
        providerLabel: "MetaMask",
        injected: true,
        networkId: snapshot.networkId,
        chainId: snapshot.chainId
      }));
      setStatus("MetaMask connecte avec succes.");
      setError("");
    } catch (connectError) {
      setError(connectError?.message || "Connexion MetaMask refusee.");
    }
  };

  useEffect(() => {
    let cancelled = false;

    if (process.env.NODE_ENV === "test") {
      return () => {
        cancelled = true;
      };
    }

    const init = async () => {
      const hasInjectedProvider = typeof window !== "undefined" && Boolean(window.ethereum);
      const provider = hasInjectedProvider
        ? window.ethereum
        : new Web3.providers.HttpProvider(LOCAL_RPC_URL);
      const instanceWeb3 = new Web3(provider);
      const snapshot = await syncChainSnapshot(instanceWeb3);

      if (cancelled) return;

      setState((prev) => ({
        ...prev,
        web3: instanceWeb3,
        providerLabel: hasInjectedProvider ? "MetaMask" : "Ganache local",
        injected: hasInjectedProvider,
        networkId: snapshot.networkId,
        chainId: snapshot.chainId
      }));
      setStatus(
        hasInjectedProvider
          ? (snapshot.accountsList.length ? "MetaMask connecte." : "MetaMask detecte. Cliquez sur Connecter pour autoriser le compte.")
          : "Connexion a Ganache locale etablie."
      );
      setError("");
    };

    init().catch((initError) => {
      if (!cancelled) {
        setError(initError?.message || "Impossible d'initialiser MetaMask ou Ganache.");
      }
    });

    const ethereum = typeof window !== "undefined" ? window.ethereum : null;
    if (!ethereum) {
      return () => {
        cancelled = true;
      };
    }

    const handleAccountsChanged = (nextAccounts) => {
      const nextAccount = nextAccounts?.[0] || "";
      setAccounts(nextAccounts || []);
      setAccount(nextAccount);
      if (!nextAccount) {
        setBalanceWei(null);
        setStatus("MetaMask est connecte mais aucun compte n'est autorise.");
        return;
      }

      if (web3Ref.current) {
        web3Ref.current.eth.getBalance(nextAccount)
          .then((balance) => setBalanceWei(balance))
          .catch(() => setBalanceWei(null));
      }
      setStatus("Compte MetaMask mis a jour.");
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    const handleDisconnect = (disconnectError) => {
      setError(disconnectError?.message || "MetaMask a ete deconnecte.");
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);
    ethereum.on("disconnect", handleDisconnect);

    return () => {
      cancelled = true;
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
      ethereum.removeListener("disconnect", handleDisconnect);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const stopPolling = () => {
      if (eventTimerRef.current) {
        clearInterval(eventTimerRef.current);
        eventTimerRef.current = null;
      }
    };

    const loadEvents = async () => {
      if (!state.web3 || !selectedContract || !selectedAddress || selectedEvents.length === 0) {
        setEventLogs([]);
        return;
      }

      const instance = new state.web3.eth.Contract(selectedContract.artifact.abi, selectedAddress);
      const deploymentBlock = selectedContract.artifact.networks?.[state.networkId]?.blockNumber || 0;
      const logs = await instance.getPastEvents("allEvents", {
        fromBlock: deploymentBlock,
        toBlock: "latest"
      });

      if (cancelled) return;

      const mappedLogs = logs.map((event) => buildEventLog(event, "past"));
      setEventLogs((currentLogs) => mergeEventLogs(currentLogs, mappedLogs));
      setStatus(
        mappedLogs.length
          ? `Evenements charges pour ${selectedContract.name}.`
          : `Aucun evenement trouve pour ${selectedContract.name}.`
      );
    };

    stopPolling();
    loadEvents().catch((eventError) => {
      if (!cancelled) {
        setError(eventError?.message || "Impossible de charger les evenements du contrat.");
      }
    });

    eventTimerRef.current = setInterval(() => {
      loadEvents().catch(() => {});
    }, 6000);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [eventRefreshKey, selectedAddress, selectedContract, selectedEvents.length, state.networkId, state.web3]);

  const handleInputChange = (methodKey, index, value) => {
    setMethodInputs((prev) => ({
      ...prev,
      [methodKey]: {
        ...prev[methodKey],
        [index]: value
      }
    }));
  };

  const handleValueChange = (methodKey, value) => {
    setMethodInputs((prev) => ({
      ...prev,
      [methodKey]: {
        ...prev[methodKey],
        value
      }
    }));
  };

  const executeMethod = async (method) => {
    if (!state.web3 || !selectedContract || !selectedAddress) {
      setError("Contrat non deploye ou Web3 non connecte.");
      return;
    }

    if (selectedNetworkMismatch) {
      setError(
        `Le contrat est déployé sur le réseau ${selectedDeployment?.networkKey || "n/a"} mais le réseau actif ne contient pas cette adresse. Redéploie avec truffle migrate --reset.`
      );
      return;
    }

    const isReadOnlyMethod = method.stateMutability === "view" || method.stateMutability === "pure";
    const executionWeb3 = isReadOnlyMethod && state.injected
      ? new Web3(new Web3.providers.HttpProvider(LOCAL_RPC_URL))
      : state.web3;
    const instance = new executionWeb3.eth.Contract(
      selectedContract.artifact.abi,
      selectedAddress
    );
    const bytecode = await executionWeb3.eth.getCode(selectedAddress);

    if (!bytecode || bytecode === "0x") {
      setError("Le contrat n'est pas present a cette adresse sur le reseau courant.");
      return;
    }

    const methodKey = `${method.name}`;
    const rawInputs = methodInputs[methodKey] || {};
    const args = normalizeMethodArguments(method, rawInputs);

    if (hasMissingInputs(method, rawInputs)) {
      setError(`Renseigne tous les parametres avant d'executer ${method.name}.`);
      return;
    }

    try {
      if (isReadOnlyMethod) {
        const result = await instance.methods[method.name](...args).call();
        setMethodResults((prev) => ({
          ...prev,
          [methodKey]: `${stringifyValue(result)} (lecture, pas de transaction)`
        }));
        return;
      }

      let senderAccount = account;
      if (!senderAccount && state.injected && typeof window !== "undefined" && window.ethereum) {
        const requestedAccounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        senderAccount = requestedAccounts?.[0] || "";
        setAccount(senderAccount);
        setAccounts(requestedAccounts || []);
      }

      if (!senderAccount) {
        setError("Aucun compte disponible pour envoyer la transaction.");
        return;
      }

      const txOptions = { from: senderAccount };
      if (method.stateMutability === "payable" && rawInputs.value) {
        txOptions.value = rawInputs.value;
      }
      const receipt = await instance.methods[method.name](...args).send(txOptions);
      const tx = await state.web3.eth.getTransaction(receipt.transactionHash);
      const block = await state.web3.eth.getBlock(receipt.blockNumber);
      const balanceAfter = tx?.from
        ? await state.web3.eth.getBalance(tx.from)
        : null;
      setLastTx({ receipt, tx, block, balanceAfter, method: method.name });
      setLatestBlock(block || null);
      setBalanceWei(balanceAfter);
      setMethodResults((prev) => ({
        ...prev,
        [methodKey]: `Transaction envoye: ${receipt.transactionHash}`
      }));
      setStatus(`Transaction executee via ${selectedContract.name}.`);
      setEventRefreshKey((currentKey) => currentKey + 1);
    } catch (err) {
      setMethodResults((prev) => ({ ...prev, [methodKey]: "Erreur" }));
      setError(err?.message || "Erreur lors de la transaction.");
    }
  };

  return (
    <div className="App">
      {!selected && (
        <header className="hero">
          <div className="hero-badge">Blockchain & Web3</div>
          <h1>Catalogue des contrats</h1>
          <p className="hero-subtitle">
            Choisis un contrat pour voir son adresse et son statut de deploiement.
          </p>
          <div className="hero-meta">
            <span className="meta-item">Provider: {state.providerLabel}</span>
            <span className="meta-item">Reseau: {state.networkId ?? "non connecte"}</span>
            <span className="meta-item">
              Compte: {shortAddress(account)}
            </span>
            <span className="meta-item">
              Balance: {balanceWei !== null ? `${formatEth(balanceWei)} ETH` : "n/a"}
            </span>
          </div>
          <div className="wallet-panel">
            <div>
              <h2>Connexion wallet</h2>
              <p className="wallet-status">{status || "Aucune action en cours."}</p>
              <p className="wallet-details">
                {state.injected
                  ? "MetaMask est detecte. Autorise le compte pour envoyer des transactions."
                  : "MetaMask n'est pas detecte; la connexion locale Ganache est active."}
              </p>
              <p className="wallet-details">Comptes autorises: {accounts.length}</p>
              <p className="wallet-details">Compte connecte: {account || "Aucun"}</p>
              <p className="wallet-details">Reseau connecte (Network ID): {state.networkId ?? "n/a"}</p>
              <p className="wallet-details">Chain ID: {state.chainId ?? "n/a"}</p>
              <p className="wallet-details">RPC: {LOCAL_RPC_URL}</p>
            </div>
            <div className="wallet-actions">
              {!isWalletConnected && (
                <button className="action" onClick={connectWallet}>
                  {state.injected ? "Connecter MetaMask" : "Recharger le wallet"}
                </button>
              )}
              <button className="back" onClick={refreshWallet}>
                Actualiser
              </button>
            </div>
          </div>
        </header>
      )}

      {!selected && (
        <section className="panel">
          <div className="panel-header">
            <h2>Liste des contrats</h2>
            <span className="count">{CONTRACTS.length} contrats</span>
          </div>
          <div className="contract-grid">
            {CONTRACTS.map((item) => (
              <button
                className="contract-card"
                key={item.name}
                onClick={() => setSelected(item.name)}
              >
                <div className="card-title">{item.name}</div>
                <div className="card-subtitle">Voir les details</div>
              </button>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
        </section>
      )}

      {selected && (
        <section className="panel detail">
          <div className="panel-header">
            <div className="panel-header-left">
              <h2>{selectedTitle}</h2>
              {selectedDescription && (
                <p className="panel-subtitle">{selectedDescription}</p>
              )}
            </div>
            <div className="panel-header-right">
              <span className={selectedAddress ? "status ok" : "status off"}>
                {selectedAddress ? "Deployee" : "Non deployee"}
              </span>
              <button className="back" onClick={() => setSelected(null)}>
                Retour
              </button>
            </div>
          </div>
          <div className="address-box">
            <span>Adresse</span>
            <strong>{selectedAddress ? selectedAddress : "non deploye"}</strong>
            <p className="wallet-details">{selectedDeploymentLabel}</p>
            {selectedAddress && (
              <p className="wallet-details">
                Reseau deploiement: {selectedDeployment?.networkKey ?? "n/a"}
              </p>
            )}
            {selectedNetworkMismatch && (
              <p className="error">
                Contrat trouve sur le reseau {selectedDeployment?.networkKey}, mais MetaMask est sur {state.networkId ?? "n/a"}. Change de reseau dans MetaMask.
              </p>
            )}
          </div>
          <div className="wallet-panel compact">
            <div>
              <h3>Compte utilisateur</h3>
              <p className="wallet-status">{account ? shortAddress(account) : "Aucun compte connecte"}</p>
              <p className="wallet-details">
                Reseau {state.networkId ?? "n/a"} | Chain {state.chainId ?? "n/a"} | Provider {state.providerLabel} | Comptes {accounts.length}
              </p>
              <p className="wallet-details">Adresse complete: {account || "Aucun"}</p>
            </div>
            <div className="wallet-actions">
              {!isWalletConnected && (
                <button className="action" onClick={connectWallet}>
                  {state.injected ? "Autoriser MetaMask" : "Connexion locale"}
                </button>
              )}
              <button className="back" onClick={refreshWallet}>
                Actualiser
              </button>
            </div>
          </div>
          <div className="info-grid">
            <div className="blockchain-column">
              <div className="info-card">
                <h3>Infos du reseau</h3>
                <p>URL: {state.injected ? "MetaMask / provider injecte" : LOCAL_RPC_URL}</p>
                <p>ID: {state.networkId ?? "n/a"}</p>
                <p>Chain ID: {state.chainId ?? "n/a"}</p>
              </div>
              <div className="info-card">
                <h3>Infos du contrat</h3>
                <p>Adresse: {selectedAddress ?? "n/a"}</p>
                <p>Compte: {account || "n/a"}</p>
                <p>Balance: {balanceWei !== null ? `${formatEth(balanceWei)} ETH` : "n/a"}</p>
              </div>
              <div className="info-card">
                <h3>Infos du dernier bloc</h3>
                <p>N°: {latestBlock?.number ?? "n/a"}</p>
                <p>Hash: {latestBlock?.hash ?? "n/a"}</p>
                <p>Timestamp: {formatTimestamp(latestBlock?.timestamp)}</p>
                <p>parentHash: {latestBlock?.parentHash ?? "n/a"}</p>
                <p>nonce: {latestBlock?.nonce ?? "n/a"}</p>
                <p>transactions: {latestBlock?.transactions?.length ?? "n/a"}</p>
                <p>miner: {latestBlock?.miner ?? "n/a"}</p>
                <p>difficulty: {latestBlock?.difficulty ?? "n/a"}</p>
                <p>gasLimit: {latestBlock?.gasLimit ?? "n/a"}</p>
                <p>gasUsed: {latestBlock?.gasUsed ?? "n/a"}</p>
                <p>size: {latestBlock?.size ?? "n/a"}</p>
              </div>
            </div>
            <div className="transaction-column">
              <div className="info-card event-card">
                <div className="panel-header event-header">
                  <div>
                    <h3>Evenements du contrat</h3>
                    <p className="muted">
                      {selectedEvents.length > 0
                        ? `${selectedEvents.length} evenement${selectedEvents.length > 1 ? "s" : ""} declare${selectedEvents.length > 1 ? "s" : ""} dans l'ABI.`
                        : "Aucun evenement declare dans l'ABI."}
                    </p>
                  </div>
                  <button className="back" onClick={() => setEventRefreshKey((currentKey) => currentKey + 1)}>
                    Rafraichir
                  </button>
                </div>
                {selectedEvents.length === 0 && <p className="muted">Ce contrat n'expose pas d'evenements a surveiller.</p>}
                {selectedEvents.length > 0 && (
                  <ul className="event-list">
                    {eventLogs.length === 0 && <li className="event-empty">Aucun evenement observe pour le moment.</li>}
                    {eventLogs.map((eventLog) => (
                      <li key={eventLog.id} className="event-item">
                        <div className="event-row">
                          <span className="event-name">{eventLog.name}</span>
                          <span className="event-pill">{eventLog.source}</span>
                        </div>
                        <div className="event-meta">
                          <span>Bloc {eventLog.blockNumber ?? "n/a"}</span>
                          <span>{shortAddress(eventLog.transactionHash)}</span>
                        </div>
                        <pre className="event-payload">{stringifyValue(eventLog.values)}</pre>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="info-card">
                <h3>Derniere transaction</h3>
                {!lastTx && <p>n/a</p>}
                {lastTx && (
                  <div className="tx-grid">
                    <div className="tx-row"><span className="tx-key">Numero</span><span className="tx-value">{lastTx.receipt?.transactionIndex ?? "n/a"}</span></div>
                    <div className="tx-row"><span className="tx-key">Expediteur</span><span className="tx-value">{lastTx.tx?.from ?? "n/a"}</span></div>
                    <div className="tx-row"><span className="tx-key">Destinataire</span><span className="tx-value">{lastTx.tx?.to ?? "n/a"}</span></div>
                    <div className="tx-row"><span className="tx-key">Hash</span><span className="tx-value">{lastTx.receipt?.transactionHash ?? "n/a"}</span></div>
                    <div className="tx-row"><span className="tx-key">Nonce</span><span className="tx-value">{lastTx.tx?.nonce ?? "n/a"}</span></div>
                    <div className="tx-row"><span className="tx-key">Montant</span><span className="tx-value">{formatEth(lastTx.tx?.value)} ETH</span></div>
                    <div className="tx-row"><span className="tx-key">Frais de transaction (Gas)</span><span className="tx-value">{formatGwei(lastTx.tx?.gasPrice)} Gwei</span></div>
                    <div className="tx-row"><span className="tx-key">Limite de Gas</span><span className="tx-value">{lastTx.tx?.gas ?? "n/a"}</span></div>
                    <div className="tx-row"><span className="tx-key">Gas utilise</span><span className="tx-value">{lastTx.receipt?.gasUsed ?? "n/a"}</span></div>
                    <div className="tx-row"><span className="tx-key">Solde apres transaction</span><span className="tx-value">{formatEth(lastTx.balanceAfter)} ETH</span></div>
                    <div className="tx-row"><span className="tx-key">Statut</span><span className="tx-value">{lastTx.receipt?.status ? "Succes" : "Echec"}</span></div>
                    <div className="tx-row"><span className="tx-key">Bloc</span><span className="tx-value">{lastTx.receipt?.blockNumber ?? "n/a"}</span></div>
                    <div className="tx-row"><span className="tx-key">Horodatage</span><span className="tx-value">{formatTimestamp(lastTx.block?.timestamp)}</span></div>
                    <div className="tx-row"><span className="tx-key">Fonction appelee</span><span className="tx-value">{lastTx.method ?? "n/a"}</span></div>
                    <div className="tx-row"><span className="tx-key">Nom du contrat</span><span className="tx-value">{selected || "n/a"}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="methods">
            <h3>Methodes disponibles</h3>
            {selectedMethods.length === 0 && (
              <p className="muted">Aucune methode exposee.</p>
            )}
            <ul className="method-list">
              {selectedMethods.map((method) => {
                const methodKey = `${method.name}`;
                return (
                  <li key={methodKey} className="method-item">
                    <div className="method-name">{method.name}</div>
                    <div className="method-meta">{method.stateMutability}</div>
                    <div className="method-form">
                      {(method.inputs || []).map((input, index) => (
                        <label key={`${methodKey}-${index}`} className="field">
                          <span>{input.name || `arg${index}`} ({input.type})</span>
                          <input
                            type="text"
                            value={methodInputs[methodKey]?.[index] || ""}
                            onChange={(e) =>
                              handleInputChange(methodKey, index, e.target.value)
                            }
                          />
                        </label>
                      ))}
                      {method.stateMutability === "payable" && (
                        <label className="field">
                          <span>value (wei)</span>
                          <input
                            type="text"
                            value={methodInputs[methodKey]?.value || ""}
                            onChange={(e) =>
                              handleValueChange(methodKey, e.target.value)
                            }
                          />
                        </label>
                      )}
                      <button className="action" onClick={() => executeMethod(method)}>
                        Executer
                      </button>
                    </div>
                    <div className="method-result">
                      Resultat: {methodResults[methodKey] || "-"}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          {error && <p className="error">{error}</p>}
        </section>
      )}
    </div>
  );
}

export default App;
