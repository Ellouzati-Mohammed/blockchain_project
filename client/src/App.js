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
  { name: "Addition", artifact: AdditionContract },
  { name: "Convertisseur", artifact: ConvertisseurContract },
  { name: "Forme", artifact: FormeContract },
  { name: "GestionChaines", artifact: GestionChainesContract },
  { name: "Parite", artifact: PariteContract },
  { name: "Payment", artifact: PaymentContract },
  { name: "Positif", artifact: PositifContract },
  { name: "Rectangle", artifact: RectangleContract },
  { name: "Tableau", artifact: TableauContract }
];

function App() {
  const [state, setState] = useState({ web3: null, networkId: null });
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const init = async () => {
      const provider = new web3.providers.HttpProvider("HTTP://127.0.0.1:7545");
      const instanceWeb3 = new web3(provider);
      const networkId = await instanceWeb3.eth.net.getId();
      setState({ web3: instanceWeb3, networkId });
      setError("");
    };

    init().catch(() => {
      setError("Impossible de se connecter a Ganache (127.0.0.1:7545).");
    });
  }, []);

  const { networkId } = state;
  const selectedContract = CONTRACTS.find((c) => c.name === selected) || null;
  const selectedAddress = selectedContract && networkId
    ? selectedContract.artifact.networks?.[networkId]?.address
    : null;

  return (
    <div className="App">
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
            <h2>Contrat: {selected}</h2>
            <span className={selectedAddress ? "status ok" : "status off"}>
              {selectedAddress ? "Deployee" : "Non deployee"}
            </span>
          </div>
          <div className="address-box">
            <span>Adresse</span>
            <strong>{selectedAddress ? selectedAddress : "non deploye"}</strong>
          </div>
          <div className="actions">
            <button className="back" onClick={() => setSelected(null)}>
              Retour
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </section>
      )}
    </div>
  );
}

export default App;
