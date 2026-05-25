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
      {!selected && (
        <div>
          <h2>Liste des contrats</h2>
          <ul>
            {CONTRACTS.map((item) => (
              <li key={item.name}>
                <button onClick={() => setSelected(item.name)}>
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
          {error && <p>{error}</p>}
        </div>
      )}

      {selected && (
        <div>
          <h2>Contrat: {selected}</h2>
          <p>
            Adresse: {selectedAddress ? selectedAddress : "non deploye"}
          </p>
          <button onClick={() => setSelected(null)}>Retour</button>
          {error && <p>{error}</p>}
        </div>
      )}
    </div>
  );
}

export default App;
