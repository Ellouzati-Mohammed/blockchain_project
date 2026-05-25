import { useEffect, useState } from "react";
import web3 from "web3";
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

function App() {
  const [state, setState] = useState({ web3: null, networkId: null });
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [account, setAccount] = useState("");
  const [latestBlock, setLatestBlock] = useState(null);
  const [lastTx, setLastTx] = useState(null);
  const [methodInputs, setMethodInputs] = useState({});
  const [methodResults, setMethodResults] = useState({});

  useEffect(() => {
    const init = async () => {
      const provider = new web3.providers.HttpProvider("HTTP://127.0.0.1:7545");
      const instanceWeb3 = new web3(provider);
      const networkId = await instanceWeb3.eth.net.getId();
      setState({ web3: instanceWeb3, networkId });

      const accounts = await instanceWeb3.eth.getAccounts();
      setAccount(accounts?.[0] || "");

      const block = await instanceWeb3.eth.getBlock("latest", true);
      setLatestBlock(block || null);
      if (block?.transactions?.length) {
        const last = block.transactions[block.transactions.length - 1];
        const receipt = await instanceWeb3.eth.getTransactionReceipt(last.hash);
        const tx = await instanceWeb3.eth.getTransaction(last.hash);
        const balanceAfter = tx?.from
          ? await instanceWeb3.eth.getBalance(tx.from)
          : null;
        setLastTx({ receipt, tx, block, balanceAfter, method: "n/a" });
      } else {
        setLastTx(null);
      }
      setError("");
    };

    init().catch(() => {
      setError("Impossible de se connecter a Ganache (127.0.0.1:7545).");
    });
  }, []);

  const { networkId } = state;
  const selectedContract = CONTRACTS.find((c) => c.name === selected) || null;
  const selectedExercise = selectedContract?.exercise ?? null;
  const selectedTitle = selected
    ? (selectedExercise ? `Exercice ${selectedExercise} — ${selected}` : selected)
    : "";
  const selectedDescription = selectedContract?.description || "";
  const selectedAddress = selectedContract && networkId
    ? selectedContract.artifact.networks?.[networkId]?.address
    : null;
  const selectedMethods = selectedContract
    ? selectedContract.artifact.abi.filter((item) => item.type === "function")
    : [];

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

    const instance = new state.web3.eth.Contract(
      selectedContract.artifact.abi,
      selectedAddress
    );

    const methodKey = `${method.name}`;
    const rawInputs = methodInputs[methodKey] || {};
    const args = (method.inputs || []).map((_, index) => rawInputs[index] ?? "");

    try {
      if (method.stateMutability === "view" || method.stateMutability === "pure") {
        const result = await instance.methods[method.name](...args).call();
        setMethodResults((prev) => ({
          ...prev,
          [methodKey]: `${String(result)} (lecture, pas de transaction)`
        }));
        return;
      }

      if (!account) {
        setError("Aucun compte disponible pour envoyer la transaction.");
        return;
      }

      const txOptions = { from: account };
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
      setMethodResults((prev) => ({ ...prev, [methodKey]: "Transaction envoye" }));
    } catch (err) {
      setMethodResults((prev) => ({ ...prev, [methodKey]: "Erreur" }));
      setError(err?.message || "Erreur lors de la transaction.");
    }
  };

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
            <span className="meta-item">Reseau: {networkId ?? "non connecte"}</span>
            <span className="meta-item">
              Connexion: {state.web3 ? "OK" : "KO"}
            </span>
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
          </div>
          <div className="info-grid">
            <div className="blockchain-column">
              <div className="info-card">
                <h3>Infos du reseau</h3>
                <p>URL: HTTP://127.0.0.1:7545</p>
                <p>ID: {networkId ?? "n/a"}</p>
              </div>
              <div className="info-card">
                <h3>Infos du contrat</h3>
                <p>Adresse: {selectedAddress ?? "n/a"}</p>
                <p>Compte: {account || "n/a"}</p>
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
