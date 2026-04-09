import { useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import { ADRESSE_CONTRAT, ABI_CONTRAT } from "./constants/contract";

function App() {
  const [compte, setCompte] = useState("");
  const [contrat, setContrat] = useState(null);
  const [voteOuvert, setVoteOuvert] = useState(false);
  const [candidats, setCandidats] = useState([]);
  const [proprietaire, setProprietaire] = useState("");
  const [estProprietaire, setEstProprietaire] = useState(false);
  const [estElecteur, setEstElecteur] = useState(false);
  const [dejaVote, setDejaVote] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function connecterMetaMask() {
    try {
      setErreur("");
      setChargement(true);

      if (!window.ethereum) {
        setErreur("MetaMask n'est pas installé.");
        return;
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const adresseCompte = await signer.getAddress();

      const reseau = await provider.getNetwork();
      const chainId = Number(reseau.chainId);

      if (chainId !== 11155111) {
        setErreur("Vous devez sélectionner le réseau Sepolia dans MetaMask.");
        return;
      }

      const instanceContrat = new ethers.Contract(
        ADRESSE_CONTRAT,
        ABI_CONTRAT,
        signer
      );

      setCompte(adresseCompte);
      setContrat(instanceContrat);

      await chargerDonnees(instanceContrat, adresseCompte);
    } catch (error) {
      console.error("Erreur MetaMask :", error);
      setErreur("Erreur lors de la connexion à MetaMask.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerDonnees(instanceContrat, adresseCompte) {
    try {
      setErreur("");

      const adresseProprietaire = await instanceContrat.proprietaire();
      const statutVote = await instanceContrat.voteOuvert();
      const statutElecteur = await instanceContrat.electeursAutorises(adresseCompte);
      const statutDejaVote = await instanceContrat.aDejaVote(adresseCompte);
      const nombreCandidats = await instanceContrat.obtenirNombreCandidats();

      const listeCandidats = [];

      for (let i = 0; i < Number(nombreCandidats); i++) {
        const candidat = await instanceContrat.obtenirCandidat(i);

        listeCandidats.push({
          id: i,
          nom: candidat[0],
          nombreDeVotes: Number(candidat[1]),
        });
      }

      setProprietaire(adresseProprietaire);
      setVoteOuvert(statutVote);
      setEstElecteur(statutElecteur);
      setDejaVote(statutDejaVote);
      setEstProprietaire(
        adresseCompte.toLowerCase() === adresseProprietaire.toLowerCase()
      );
      setCandidats(listeCandidats);
    } catch (error) {
      console.error("Erreur chargement contrat :", error);
      setErreur("Erreur lors du chargement des données du contrat.");
    }
  }

  async function rafraichir() {
    if (!contrat || !compte) return;
    await chargerDonnees(contrat, compte);
  }

  function tronquerAdresse(adresse) {
    if (!adresse) return "";
    return `${adresse.slice(0, 6)}...${adresse.slice(-4)}`;
  }

  return (
    <div className="conteneur">
      <h1>App de vote</h1>

      {!compte ? (
        <button onClick={connecterMetaMask} disabled={chargement}>
          {chargement ? "Connexion..." : "Connecter MetaMask"}
        </button>
      ) : (
        <div className="carte">
          <p>
            <strong>Compte connecté :</strong> {tronquerAdresse(compte)}
          </p>
          <p>
            <strong>Propriétaire :</strong> {tronquerAdresse(proprietaire)}
          </p>
          <p>
            <strong>Vote :</strong> {voteOuvert ? "Ouvert" : "Fermé"}
          </p>
          <p>
            <strong>Votre statut :</strong>{" "}
            {estProprietaire
              ? "Administrateur"
              : estElecteur
              ? "Électeur autorisé"
              : "Visiteur"}
          </p>
          <p>
            <strong>A déjà voté :</strong> {dejaVote ? "Oui" : "Non"}
          </p>

          <button onClick={rafraichir}>Rafraîchir</button>
        </div>
      )}

      {erreur && <p className="erreur">{erreur}</p>}

      <div className="carte">
        <h2>Liste des candidats</h2>

        {candidats.length === 0 ? (
          <p>Aucun candidat chargé pour le moment.</p>
        ) : (
          <ul>
            {candidats.map((candidat) => (
              <li key={candidat.id}>
                {candidat.nom} — {candidat.nombreDeVotes} vote(s)
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;