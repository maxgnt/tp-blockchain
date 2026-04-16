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
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [adresseNouvelElecteur, setAdresseNouvelElecteur] = useState("");

  async function connecterMetaMask() {
    try {
      setErreur("");
      setMessage("");
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

  async function ajouterElecteur() {
    try {
      setErreur("");
      setMessage("");

      if (!contrat) {
        setErreur("Contrat non chargé.");
        return;
      }

      if (!adresseNouvelElecteur.trim()) {
        setErreur("Veuillez saisir une adresse.");
        return;
      }

      if (!ethers.isAddress(adresseNouvelElecteur.trim())) {
        setErreur("Adresse Ethereum invalide.");
        return;
      }

      setChargement(true);

      const transaction = await contrat.ajouterElecteur(
        adresseNouvelElecteur.trim()
      );

      setMessage("Transaction envoyée... attente de confirmation.");
      await transaction.wait();

      setMessage("Électeur ajouté avec succès.");
      setAdresseNouvelElecteur("");

      await rafraichir();
    } catch (error) {
      console.error("Erreur ajout électeur :", error);

      if (error.reason) {
        setErreur(error.reason);
      } else if (error.shortMessage) {
        setErreur(error.shortMessage);
      } else {
        setErreur("Erreur lors de l'ajout de l'électeur.");
      }
    } finally {
      setChargement(false);
    }
  }

  async function ouvrirLeVote() {
    try {
      setErreur("");
      setMessage("");

      if (!contrat) {
        setErreur("Contrat non chargé.");
        return;
      }

      setChargement(true);

      const transaction = await contrat.ouvrirLeVote();

      setMessage("Transaction envoyée... attente de confirmation.");
      await transaction.wait();

      setMessage("Le vote est maintenant ouvert.");

      await rafraichir();
    } catch (error) {
      console.error("Erreur ouverture vote :", error);

      if (error.reason) {
        setErreur(error.reason);
      } else if (error.shortMessage) {
        setErreur(error.shortMessage);
      } else {
        setErreur("Erreur lors de l'ouverture du vote.");
      }
    } finally {
      setChargement(false);
    }
  }

  async function voter(idCandidat) {
    try {
      setErreur("");
      setMessage("");

      if (!contrat) {
        setErreur("Contrat non chargé.");
        return;
      }

      setChargement(true);

      const transaction = await contrat.voter(idCandidat);

      setMessage("Vote envoyé... attente de confirmation.");
      await transaction.wait();

      setMessage("Votre vote a bien été enregistré.");

      await rafraichir();
    } catch (error) {
      console.error("Erreur vote :", error);

      if (error.reason) {
        setErreur(error.reason);
      } else if (error.shortMessage) {
        setErreur(error.shortMessage);
      } else {
        setErreur("Erreur lors du vote.");
      }
    } finally {
      setChargement(false);
    }
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

          <button onClick={rafraichir} disabled={chargement}>
            Rafraîchir
          </button>
        </div>
      )}

      {erreur && <p className="erreur">{erreur}</p>}
      {message && <p className="succes">{message}</p>}

      {compte && estProprietaire && (
        <div className="carte">
          <h2>Panneau administrateur</h2>

          <input
            type="text"
            placeholder="Adresse Ethereum de l'électeur"
            value={adresseNouvelElecteur}
            onChange={(e) => setAdresseNouvelElecteur(e.target.value)}
          />

          <div className="actions-admin">
            <button onClick={ajouterElecteur} disabled={chargement}>
              Ajouter un électeur
            </button>

            {!voteOuvert && (
              <button onClick={ouvrirLeVote} disabled={chargement}>
                Ouvrir le vote
              </button>
            )}
          </div>
        </div>
      )}

      {compte && estElecteur && (
        <div className="carte">
          <h2>Espace électeur</h2>

          {!voteOuvert ? (
            <p>Le vote n'est pas encore ouvert.</p>
          ) : dejaVote ? (
            <p>Vous avez déjà voté.</p>
          ) : (
            <div className="liste-vote">
              <p>Sélectionnez un candidat :</p>

              {candidats.map((candidat) => (
                <div key={candidat.id} className="ligne-candidat">
                  <span>
                    {candidat.nom} — {candidat.nombreDeVotes} vote(s)
                  </span>

                  <button
                    onClick={() => voter(candidat.id)}
                    disabled={chargement}
                  >
                    Voter pour {candidat.nom}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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