import { useEffect, useState } from "react";
import web3 from "web3";
import AdditionContract from "./contracts/Addition.json";
import './App.css';

function App() {
  const [state, setState] = useState({ web3: null, contract: null });
  const [data, setData] = useState("nil");
  const [error, setError] = useState("");
  const provider = new web3.providers.HttpProvider("HTTP://127.0.0.1:7545");
  const instanceWeb3 = new web3(provider); 

  useEffect(() => {
    const init = async () => {
      const networkId = await instanceWeb3.eth.net.getId();
      const deployedNetwork = AdditionContract.networks[networkId];
      if (!deployedNetwork) {
        setError("Contract not deployed on this network.");
        return;
      }
      const contract = new instanceWeb3.eth.Contract(
        AdditionContract.abi,
        deployedNetwork.address
      );
      setState({ web3: instanceWeb3, contract });
      setError("");
    };

    init();
  }, [instanceWeb3]);

  const { contract } = state;

  async function readData() {
    if (!contract) {
      return;
    }
    const data = await contract.methods.getValue().call();
    setData(data);
  }

  async function writeData() {
    if (!contract) {
      return;
    }
    const data = document.querySelector("#value").value;
    await contract.methods
      .setValue(data)
      .send({ from: "0xEdC25DbD057Fc781A01156EAeaaBA66A3bEF4Ea7" });
    window.location.reload();
  }

  return (
    <div className="App">
      
    </div>
  );
}

export default App;
