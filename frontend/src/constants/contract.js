export const ADRESSE_CONTRAT = "0x8F4575Dbaaa338d063dA0F77862F7303E4BC74D9";

export const ABI_CONTRAT = [
  "function proprietaire() view returns (address)",
  "function voteOuvert() view returns (bool)",
  "function electeursAutorises(address) view returns (bool)",
  "function aDejaVote(address) view returns (bool)",
  "function obtenirNombreCandidats() view returns (uint256)",
  "function obtenirCandidat(uint256) view returns (string, uint256)",
  "function obtenirGagnant() view returns (string, uint256)",
  "function ajouterElecteur(address electeur)",
  "function ouvrirLeVote()",
  "function voter(uint256 idCandidat)",
  "event ElecteurAjoute(address indexed electeur)",
  "event VoteOuvert()",
  "event VoteEffectue(address indexed electeur, uint256 indexed idCandidat)"
];